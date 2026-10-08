import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BufferedEntityWriter, BufferedEntityWriterOptions } from './buffered-entity-writer';

interface Row {
    value: string;
}

const OPTIONS: BufferedEntityWriterOptions = {
    name: 'test_rows',
    capacity: 10,
    batchSize: 4,
    flushIntervalInMs: 1000,
    acquireTimeoutInMs: 5000,
    maxBackoffInMs: 30000,
    shutdownTimeoutInMs: 5000,
    dropReportIntervalInMs: 60000,
};

function dbError(code: string): Error {
    return Object.assign(new Error(code), { code });
}

/** A DataSource whose INSERTs are answered by the given handler; records every statement. */
function mockDataSource(handler: (rows: Row[]) => Promise<void>) {
    const inserts: Row[][] = [];
    let inFlight = 0;
    let maxInFlight = 0;
    const release = jest.fn().mockResolvedValue(undefined);

    const createQueryRunner = jest.fn(() => ({
        connect: jest.fn().mockResolvedValue(undefined),
        release,
        manager: {
            createQueryBuilder: () => {
                let rows: Row[] = [];
                const chain = {
                    insert: () => chain,
                    into: () => chain,
                    values: (values: Row[]) => {
                        rows = values;
                        return chain;
                    },
                    updateEntity: () => chain,
                    execute: async () => {
                        inserts.push([...rows]);
                        inFlight++;
                        maxInFlight = Math.max(maxInFlight, inFlight);
                        try {
                            await handler(rows);
                        } finally {
                            inFlight--;
                        }
                    },
                };
                return chain;
            },
        },
    }));

    return {
        dataSource: { createQueryRunner } as unknown as DataSource,
        inserts,
        release,
        maxInFlight: () => maxInFlight,
    };
}

const rows = (count: number, prefix = 'r') => Array.from({ length: count }, (_, i) => ({ value: `${prefix}${i}` }));

describe('BufferedEntityWriter', () => {
    beforeEach(() => {
        jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    it('writes buffered rows in multi-row INSERTs of at most batchSize rows, one statement at a time', async () => {
        const { dataSource, inserts, release, maxInFlight } = mockDataSource(() => Promise.resolve());
        const writer = new BufferedEntityWriter<Row>(dataSource, 'Row', OPTIONS);

        rows(10).forEach((row) => writer.enqueue(row));
        await writer.flush();

        expect(inserts.map((batch) => batch.length)).toEqual([4, 4, 2]);
        expect(maxInFlight()).toBe(1);
        expect(release).toHaveBeenCalledTimes(3);
        expect(writer.stats()).toEqual({ buffered: 0, written: 10, dropped: 0, rejected: 0 });
    });

    it('never makes the producer wait, even while an INSERT hangs', async () => {
        const { dataSource, inserts } = mockDataSource(() => new Promise<void>(() => undefined));
        const writer = new BufferedEntityWriter<Row>(dataSource, 'Row', OPTIONS);

        const accepted = rows(10).map((row) => writer.enqueue(row));
        await new Promise((resolve) => setImmediate(resolve));
        rows(5, 'more').forEach((row) => writer.enqueue(row));
        await new Promise((resolve) => setImmediate(resolve));

        expect(accepted.every(Boolean)).toBe(true);
        expect(inserts).toHaveLength(1);
        expect(writer.stats()).toMatchObject({ buffered: 10, dropped: 1 });
    });

    it('drops rows while the buffer is full and documents the gap in front of the next written batch', async () => {
        const { dataSource, inserts } = mockDataSource(() => Promise.resolve());
        const writer = new BufferedEntityWriter<Row>(dataSource, 'Row', { ...OPTIONS, batchSize: 100 }, (dropped) => ({
            value: `gap:${dropped}`,
        }));

        const accepted = rows(13).map((row) => writer.enqueue(row));
        await writer.flush();

        expect(accepted.filter((result) => !result)).toHaveLength(3);
        expect(inserts[0]?.[0]).toEqual({ value: 'gap:3' });
        expect(inserts[0]).toHaveLength(11);
        expect(writer.stats()).toMatchObject({ dropped: 3, buffered: 0 });
    });

    it('keeps rows buffered and backs off while the database is unavailable', async () => {
        jest.useFakeTimers();
        let available = false;
        const { dataSource, inserts } = mockDataSource(() =>
            available ? Promise.resolve() : Promise.reject(dbError('ECONNREFUSED')),
        );
        const writer = new BufferedEntityWriter<Row>(dataSource, 'Row', OPTIONS);
        writer.start();

        rows(3).forEach((row) => writer.enqueue(row));
        await jest.advanceTimersByTimeAsync(1000);
        expect(inserts).toHaveLength(1);
        expect(writer.stats().buffered).toBe(3);

        // Backoff (1 s after the first failure, then 2 s): the next tick does not retry yet.
        await jest.advanceTimersByTimeAsync(1000);
        expect(inserts).toHaveLength(2);
        await jest.advanceTimersByTimeAsync(1000);
        expect(inserts).toHaveLength(2);

        available = true;
        await jest.advanceTimersByTimeAsync(2000);
        expect(writer.stats()).toMatchObject({ buffered: 0, written: 3 });

        await writer.stop();
    });

    it('drops only the rows the database rejects for deterministic reasons', async () => {
        const { dataSource } = mockDataSource((batch) =>
            batch.some((row) => row.value === 'r2') ? Promise.reject(dbError('ER_DATA_TOO_LONG')) : Promise.resolve(),
        );
        const writer = new BufferedEntityWriter<Row>(dataSource, 'Row', OPTIONS);

        rows(4).forEach((row) => writer.enqueue(row));
        await writer.flush();

        expect(writer.stats()).toEqual({ buffered: 0, written: 3, dropped: 0, rejected: 1 });
    });

    it('also recognises deterministic errors wrapped by TypeORM', async () => {
        const wrapped = Object.assign(new Error('QueryFailedError'), { driverError: { code: 'ER_DATA_TOO_LONG' } });
        const { dataSource } = mockDataSource(() => Promise.reject(wrapped));
        const writer = new BufferedEntityWriter<Row>(dataSource, 'Row', OPTIONS);

        rows(2).forEach((row) => writer.enqueue(row));
        await writer.flush();

        expect(writer.stats()).toMatchObject({ buffered: 0, rejected: 2 });
    });

    it('writes what is buffered on stop and rejects rows offered afterwards', async () => {
        const { dataSource, inserts } = mockDataSource(() => Promise.resolve());
        const writer = new BufferedEntityWriter<Row>(dataSource, 'Row', OPTIONS);

        rows(3).forEach((row) => writer.enqueue(row));
        await writer.stop();

        expect(inserts.flat()).toHaveLength(3);
        expect(writer.enqueue({ value: 'late' })).toBe(false);
    });

    it('reports rows that could not be written before the shutdown deadline as discarded', async () => {
        const { dataSource } = mockDataSource(() => Promise.reject(dbError('ECONNREFUSED')));
        const writer = new BufferedEntityWriter<Row>(dataSource, 'Row', OPTIONS);

        rows(3).forEach((row) => writer.enqueue(row));
        await writer.stop();

        expect(writer.stats()).toMatchObject({ buffered: 0, written: 0, dropped: 3 });
    });

    it('ends stop() at the shutdown deadline while an INSERT hangs (half-open connection)', async () => {
        const { dataSource, inserts } = mockDataSource(() => new Promise<void>(() => undefined)); // never answers
        const writer = new BufferedEntityWriter<Row>(dataSource, 'Row', { ...OPTIONS, shutdownTimeoutInMs: 200 });

        rows(6).forEach((row) => writer.enqueue(row)); // reaches the batch size: a flush is in flight
        const startedAt = Date.now();
        await writer.stop();

        expect(Date.now() - startedAt).toBeGreaterThanOrEqual(150);
        expect(Date.now() - startedAt).toBeLessThan(1000);
        expect(inserts).toHaveLength(1); // the hanging batch; nothing is started after the deadline
        expect(writer.stats()).toMatchObject({ buffered: 0, written: 0, dropped: 2 });
        expect((Logger.prototype.warn as jest.Mock).mock.calls.flat()).toContainEqual(
            expect.stringContaining('did not finish within the shutdown timeout'),
        );
    });

    it('ends stop() at the deadline when the hanging INSERT starts during shutdown', async () => {
        let hang = false;
        const { dataSource, inserts } = mockDataSource(() =>
            hang ? new Promise<void>(() => undefined) : Promise.resolve(),
        );
        const writer = new BufferedEntityWriter<Row>(dataSource, 'Row', { ...OPTIONS, shutdownTimeoutInMs: 200 });

        rows(3).forEach((row) => writer.enqueue(row)); // below the batch size: nothing in flight yet
        hang = true;
        const startedAt = Date.now();
        await writer.stop();

        expect(Date.now() - startedAt).toBeLessThan(1000);
        expect(inserts).toHaveLength(1);
        expect(writer.stats()).toMatchObject({ buffered: 0, written: 0 });
    });

    it('flushes on its own interval once started', async () => {
        jest.useFakeTimers();
        const { dataSource, inserts } = mockDataSource(() => Promise.resolve());
        const writer = new BufferedEntityWriter<Row>(dataSource, 'Row', OPTIONS);
        writer.start();

        writer.enqueue({ value: 'a' });
        expect(inserts).toHaveLength(0);
        await jest.advanceTimersByTimeAsync(1000);

        expect(inserts).toEqual([[{ value: 'a' }]]);
        await writer.stop();
    });
});
