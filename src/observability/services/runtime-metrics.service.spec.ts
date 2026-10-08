import { createPool } from 'mysql2';
import { DataSource, EntitySchema } from 'typeorm';
import { RuntimeMetricsService } from './runtime-metrics.service';

describe('RuntimeMetricsService', () => {
    it('reports the current process memory in bytes', () => {
        const service = new RuntimeMetricsService({} as DataSource);

        const memory = service.memory();

        expect(memory.heapUsedBytes).toBeGreaterThan(0);
        expect(memory.heapSizeLimitBytes).toBeGreaterThanOrEqual(memory.heapTotalBytes);
        expect(memory.rssBytes).toBeGreaterThan(0);
    });

    it('reads the figures of a real mysql2 pool without connecting', async () => {
        // Guards the private field names of the installed mysql2 version; no connection is opened.
        const pool = createPool({ host: '127.0.0.1', port: 1, user: 'none', connectionLimit: 3 });
        const service = new RuntimeMetricsService({ driver: { pool } } as unknown as DataSource);

        expect(service.pool()).toEqual({ all: 0, free: 0, queued: 0 });

        await new Promise<void>((resolve) => pool.end(() => resolve()));
    });

    it.each([
        { name: 'no pool (not connected)', driver: {} },
        { name: 'unknown pool internals', driver: { pool: { connections: [] } } },
        {
            name: 'throwing internals',
            driver: {
                get pool(): never {
                    throw new Error('boom');
                },
            },
        },
    ])('returns undefined for the pool when there is $name', ({ driver }) => {
        const service = new RuntimeMetricsService({ driver } as unknown as DataSource);

        expect(service.pool()).toBeUndefined();
    });

    it('counts the repositories cached by the long-lived entity manager', async () => {
        const schema = new EntitySchema({ name: 'metrics_probe', columns: { id: { type: Number, primary: true } } });
        const dataSource = new DataSource({
            type: 'mariadb',
            connectorPackage: 'mysql2',
            database: 'not-connected',
            entities: [schema],
        });
        await (dataSource as unknown as { buildMetadatas(): Promise<void> }).buildMetadatas();
        const service = new RuntimeMetricsService(dataSource);
        const before = service.repositoryCacheEntries();

        dataSource.manager.getRepository(schema);
        dataSource.manager.getRepository(schema);

        expect(before).toBe(0);
        expect(service.repositoryCacheEntries()).toBe(1);
    });

    it('returns undefined for the repository cache when the entity manager has no repository map', () => {
        const service = new RuntimeMetricsService({ manager: {} } as unknown as DataSource);

        expect(service.repositoryCacheEntries()).toBeUndefined();
    });
});
