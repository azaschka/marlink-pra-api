/**
 * Opt-in integration test against a real MariaDB (skipped unless PRA_TEST_MARIADB_HOST is set), see
 * align-pra-logs-and-add-retention-indexes.mariadb.spec.ts for the variables.
 */
import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { MonitoringRecordEntity } from '../../monitoring/repositories/entities';
import { HealthContributorRegistry } from '../../observability/services/health-contributor-registry.service';
import { RetentionService } from './retention.service';

const host = process.env.PRA_TEST_MARIADB_HOST;
const describeWithMariaDb = host ? describe : describe.skip;

describeWithMariaDb('RetentionService on MariaDB', () => {
    const dataSources: DataSource[] = [];
    const config = {
        cronJob: { logRetentionDays: 90 },
        retention: { monitoringRetentionDays: 90, distributedLockEnabled: true },
    } as unknown as AppConfigService;

    const connect = async () => {
        const dataSource = new DataSource({
            type: 'mariadb',
            connectorPackage: 'mysql2',
            host,
            port: Number(process.env.PRA_TEST_MARIADB_PORT ?? 3306),
            username: process.env.PRA_TEST_MARIADB_USER ?? 'pra',
            password: process.env.PRA_TEST_MARIADB_PASSWORD ?? 'pra',
            database: process.env.PRA_TEST_MARIADB_DATABASE ?? 'pra_it',
            entities: [MonitoringRecordEntity],
            synchronize: true,
        });
        await dataSource.initialize();
        dataSources.push(dataSource);

        return dataSource;
    };

    const seed = async (dataSource: DataSource, oldRows: number, newRows: number) => {
        await dataSource.query('DELETE FROM pra_monitorings');
        await dataSource.query(
            `INSERT INTO pra_monitorings (endpoint_path, creation_date)
             SELECT '/old', NOW() - INTERVAL 120 DAY - INTERVAL seq SECOND FROM seq_1_to_${oldRows}`,
        );
        await dataSource.query(
            `INSERT INTO pra_monitorings (endpoint_path, creation_date)
             SELECT '/new', NOW() - INTERVAL seq MINUTE FROM seq_1_to_${newRows}`,
        );
    };

    const count = async (dataSource: DataSource, path: string) => {
        const rows: unknown = await dataSource.query(
            'SELECT COUNT(*) AS n FROM pra_monitorings WHERE endpoint_path = ?',
            [path],
        );

        return Number((rows as { n: string }[])[0]?.n);
    };

    beforeEach(() => {
        jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
        jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        await dataSources[0]?.query('DROP TABLE IF EXISTS pra_monitorings');
        await Promise.all(dataSources.map((dataSource) => dataSource.destroy()));
    });

    it('deletes only rows older than 90 days, in batches of at most 5,000', async () => {
        const dataSource = await connect();
        await seed(dataSource, 12345, 100);

        const report = await new RetentionService(dataSource, config, new HealthContributorRegistry()).enforce(
            'pra_monitorings',
        );

        expect(report).toEqual(
            expect.objectContaining({ status: 'completed', deleted: 12345, batches: 3, backlog: false }),
        );
        expect(await count(dataSource, '/old')).toBe(0);
        expect(await count(dataSource, '/new')).toBe(100);
    }, 60000);

    it('continues an interrupted run in the next run', async () => {
        const dataSource = await connect();
        await seed(dataSource, 12000, 10);
        const service = new RetentionService(dataSource, config, new HealthContributorRegistry());
        const limits = RetentionService.SCHEDULED_DELETE as { maxDurationInMs: number };
        const original = limits.maxDurationInMs;
        limits.maxDurationInMs = 1; // stop after the first batch

        try {
            const first = await service.enforce('pra_monitorings');
            expect(first).toEqual(expect.objectContaining({ status: 'incomplete', deleted: 5000, backlog: true }));
        } finally {
            limits.maxDurationInMs = original;
        }

        const second = await service.enforce('pra_monitorings');
        expect(second).toEqual(expect.objectContaining({ status: 'completed', deleted: 7000, backlog: false }));
    }, 60000);

    it('runs the retention of a table only once across two replicas', async () => {
        const a = await connect();
        const b = await connect();
        await seed(a, 30000, 1);

        const [first, second] = await Promise.all([
            new RetentionService(a, config, new HealthContributorRegistry()).enforce('pra_monitorings'),
            new Promise((resolve) => setTimeout(resolve, 50)).then(() =>
                new RetentionService(b, config, new HealthContributorRegistry()).enforce('pra_monitorings'),
            ),
        ]);

        expect([first.status, second.status].sort()).toEqual(['completed', 'skipped']);
        expect(await count(a, '/old')).toBe(0);
    }, 60000);
});
