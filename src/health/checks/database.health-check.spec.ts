import { DataSource } from 'typeorm';
import { DatabaseHealthCheck } from './database.health-check';

function dataSourceWith(queryRunner: { connect: () => Promise<void>; query: jest.Mock; release: jest.Mock }) {
    return { createQueryRunner: () => queryRunner } as unknown as DataSource;
}

describe('DatabaseHealthCheck', () => {
    afterEach(() => {
        jest.useRealTimers();
    });

    it('is up with the latency when SELECT 1 answers', async () => {
        const queryRunner = {
            connect: () => Promise.resolve(),
            query: jest.fn().mockResolvedValue([]),
            release: jest.fn().mockResolvedValue(undefined),
        };

        const check = await new DatabaseHealthCheck(dataSourceWith(queryRunner)).check();

        expect(check).toEqual(expect.objectContaining({ status: 'up', critical: true }));
        expect(typeof check.latencyMs).toBe('number');
        expect(queryRunner.release).toHaveBeenCalledTimes(1);
    });

    it('is down within 2 s when the pool has no free connection, instead of queuing', async () => {
        jest.useFakeTimers();
        const queryRunner = { connect: () => new Promise<void>(() => undefined), query: jest.fn(), release: jest.fn() };

        const result = new DatabaseHealthCheck(dataSourceWith(queryRunner)).check();
        await jest.advanceTimersByTimeAsync(DatabaseHealthCheck.ACQUIRE_TIMEOUT_IN_MS);

        await expect(result).resolves.toEqual(
            expect.objectContaining({ status: 'down', message: 'No database connection within 2000 ms' }),
        );
        expect(queryRunner.query).not.toHaveBeenCalled();
    });

    it('is down and discards the connection when SELECT 1 hangs', async () => {
        jest.useFakeTimers();
        const destroy = jest.fn();
        const queryRunner = {
            connect: () => Promise.resolve(),
            query: jest.fn(() => new Promise(() => undefined)),
            release: jest.fn().mockResolvedValue(undefined),
            databaseConnection: { destroy },
        };

        const result = new DatabaseHealthCheck(dataSourceWith(queryRunner)).check();
        await jest.advanceTimersByTimeAsync(DatabaseHealthCheck.QUERY_TIMEOUT_IN_MS);

        await expect(result).resolves.toEqual(
            expect.objectContaining({ status: 'down', message: 'No answer to SELECT 1 within 2000 ms' }),
        );
        expect(destroy).toHaveBeenCalledTimes(1);
        expect(queryRunner.release).toHaveBeenCalledTimes(1);
    });

    it('runs at most one SELECT 1 per 5 s for any number of health requests', async () => {
        const queryRunner = {
            connect: () => Promise.resolve(),
            query: jest.fn().mockResolvedValue([]),
            release: jest.fn().mockResolvedValue(undefined),
        };
        const check = new DatabaseHealthCheck(dataSourceWith(queryRunner));

        await Promise.all(Array.from({ length: 50 }, () => check.check()));
        await check.check();

        expect(queryRunner.query).toHaveBeenCalledTimes(1);
    });
});
