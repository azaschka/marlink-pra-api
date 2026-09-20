import { ServiceUnavailableException } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { DatabaseConnectionUtility } from './database-connection.utility';

describe('DatabaseConnectionUtility', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    describe('acquireQueryRunner', () => {
        it('should return the connected query runner and leave no pending timer behind', async () => {
            const { dataSource, queryRunner, release } = mockDataSource([Promise.resolve()]);

            const result = await DatabaseConnectionUtility.acquireQueryRunner(dataSource, 1000);

            expect(result).toBe(queryRunner);
            expect(release).not.toHaveBeenCalled();
            expect(jest.getTimerCount()).toBe(0);
        });

        it('should fail with 503 when no pooled connection is available within the timeout', async () => {
            const { dataSource } = mockDataSource([new Promise<void>(() => undefined)]);

            const promise = DatabaseConnectionUtility.acquireQueryRunner(dataSource, 1000);
            const assertion = expect(promise).rejects.toBeInstanceOf(ServiceUnavailableException);
            await jest.advanceTimersByTimeAsync(1000);

            await assertion;
        });

        it('should release a connection that is handed out after the timeout, so it does not leak from the pool', async () => {
            let handOutConnection: () => void = () => undefined;
            const late = new Promise<void>((resolve) => {
                handOutConnection = resolve;
            });
            const { dataSource, release } = mockDataSource([late]);

            const promise = DatabaseConnectionUtility.acquireQueryRunner(dataSource, 1000);
            const assertion = expect(promise).rejects.toBeInstanceOf(ServiceUnavailableException);
            await jest.advanceTimersByTimeAsync(1000);
            await assertion;
            expect(release).not.toHaveBeenCalled();

            handOutConnection();
            await jest.advanceTimersByTimeAsync(0);

            expect(release).toHaveBeenCalledTimes(1);
        });

        it('should pass on the connect error and not release anything when connecting fails', async () => {
            const error = new Error('connect failed');
            const { dataSource, release } = mockDataSource([Promise.reject(error)]);

            await expect(DatabaseConnectionUtility.acquireQueryRunner(dataSource, 1000)).rejects.toBe(error);

            expect(release).not.toHaveBeenCalled();
            expect(jest.getTimerCount()).toBe(0);
        });
    });

    describe('executeRead', () => {
        it('should run the operation once and release the connection', async () => {
            const { dataSource, queryRunner, release } = mockDataSource([Promise.resolve()]);
            const operation = jest.fn().mockResolvedValue('result');

            const result = await DatabaseConnectionUtility.executeRead(dataSource, operation, 2);

            expect(result).toBe('result');
            expect(operation).toHaveBeenCalledTimes(1);
            expect(operation).toHaveBeenCalledWith(queryRunner);
            expect(release).toHaveBeenCalledTimes(1);
        });

        it.each([
            { name: 'connection lost', error: Object.assign(new Error('lost'), { code: 'PROTOCOL_CONNECTION_LOST' }) },
            { name: 'connection reset', error: Object.assign(new Error('reset'), { code: 'ECONNRESET' }) },
        ])(
            'should repeat the read once with a fresh connection after $name and release both connections',
            async ({ error }) => {
                const { dataSource, release, createQueryRunner } = mockDataSource([
                    Promise.resolve(),
                    Promise.resolve(),
                ]);
                const operation = jest.fn().mockRejectedValueOnce(error).mockResolvedValueOnce('result');

                const result = await DatabaseConnectionUtility.executeRead(dataSource, operation, 2);

                expect(result).toBe('result');
                expect(operation).toHaveBeenCalledTimes(2);
                expect(createQueryRunner).toHaveBeenCalledTimes(2);
                expect(release).toHaveBeenCalledTimes(2);
            },
        );

        it('should throw the last error when all attempts hit a dead connection', async () => {
            const error = Object.assign(new Error('lost'), { code: 'PROTOCOL_CONNECTION_LOST' });
            const { dataSource, release } = mockDataSource([Promise.resolve(), Promise.resolve()]);
            const operation = jest.fn().mockRejectedValue(error);

            await expect(DatabaseConnectionUtility.executeRead(dataSource, operation, 2)).rejects.toBe(error);

            expect(operation).toHaveBeenCalledTimes(2);
            expect(release).toHaveBeenCalledTimes(2);
        });

        it('should not repeat the read for errors that are not caused by a dead connection', async () => {
            const error = Object.assign(new Error('deadlock'), { code: 'ER_LOCK_DEADLOCK' });
            const { dataSource, release } = mockDataSource([Promise.resolve()]);
            const operation = jest.fn().mockRejectedValue(error);

            await expect(DatabaseConnectionUtility.executeRead(dataSource, operation, 2)).rejects.toBe(error);

            expect(operation).toHaveBeenCalledTimes(1);
            expect(release).toHaveBeenCalledTimes(1);
        });

        it('should not repeat the read when only one attempt is allowed', async () => {
            const error = Object.assign(new Error('lost'), { code: 'PROTOCOL_CONNECTION_LOST' });
            const { dataSource } = mockDataSource([Promise.resolve()]);
            const operation = jest.fn().mockRejectedValue(error);

            await expect(DatabaseConnectionUtility.executeRead(dataSource, operation, 1)).rejects.toBe(error);

            expect(operation).toHaveBeenCalledTimes(1);
        });
    });

    describe('isTransientConnectionError', () => {
        it.each([
            {
                name: 'error code PROTOCOL_CONNECTION_LOST',
                error: { code: 'PROTOCOL_CONNECTION_LOST' },
                expected: true,
            },
            { name: 'error code ECONNRESET', error: { code: 'ECONNRESET' }, expected: true },
            { name: 'error code EPIPE', error: { code: 'EPIPE' }, expected: true },
            {
                name: 'wrapped driver error',
                error: { message: 'query failed', driverError: { code: 'PROTOCOL_CONNECTION_LOST' } },
                expected: true,
            },
            {
                name: 'closed connection message',
                error: new Error("Can't add new command when connection is in closed state"),
                expected: true,
            },
            { name: 'deadlock', error: { code: 'ER_LOCK_DEADLOCK' }, expected: false },
            { name: 'syntax error', error: { code: 'ER_PARSE_ERROR', message: 'syntax' }, expected: false },
            { name: 'read timeout', error: { code: 'ETIMEDOUT' }, expected: false },
            { name: 'plain string', error: 'ECONNRESET', expected: false },
            { name: 'null', error: null, expected: false },
            { name: 'undefined', error: undefined, expected: false },
        ])('should return $expected for $name', ({ error, expected }) => {
            expect(DatabaseConnectionUtility.isTransientConnectionError(error)).toBe(expected);
        });
    });
});

function mockDataSource(connectResults: Promise<void>[]) {
    const connect = jest.fn();
    const release = jest.fn().mockResolvedValue(undefined);
    connectResults.forEach((result) => connect.mockReturnValueOnce(result));
    const queryRunner = { connect, release } as unknown as QueryRunner;
    const createQueryRunner = jest.fn().mockReturnValue(queryRunner);
    const dataSource = { createQueryRunner } as unknown as DataSource;

    return { dataSource, queryRunner, release, createQueryRunner };
}
