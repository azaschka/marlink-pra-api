/**
 * Opt-in integration test against a real MariaDB (skipped unless PRA_TEST_MARIADB_HOST is set), e.g.
 * PRA_TEST_MARIADB_HOST=127.0.0.1 PRA_TEST_MARIADB_USER=pra PRA_TEST_MARIADB_PASSWORD=pra
 * PRA_TEST_MARIADB_DATABASE=pra_it npx jest align-pra-logs
 */
import { DataSource } from 'typeorm';
import { LogEntity } from '../../log/repositories/entities';
import { MonitoringRecordEntity } from '../../monitoring/repositories/entities';
import { alignPraLogsAndAddRetentionIndexes } from './align-pra-logs-and-add-retention-indexes.migration';

const host = process.env.PRA_TEST_MARIADB_HOST;
const describeWithMariaDb = host ? describe : describe.skip;

describeWithMariaDb('alignPraLogsAndAddRetentionIndexes on MariaDB', () => {
    let dataSource: DataSource;

    const options = {
        type: 'mariadb' as const,
        connectorPackage: 'mysql2' as const,
        host,
        port: Number(process.env.PRA_TEST_MARIADB_PORT ?? 3306),
        username: process.env.PRA_TEST_MARIADB_USER ?? 'pra',
        password: process.env.PRA_TEST_MARIADB_PASSWORD ?? 'pra',
        database: process.env.PRA_TEST_MARIADB_DATABASE ?? 'pra_it',
    };

    beforeAll(async () => {
        dataSource = new DataSource({ ...options, entities: [] });
        await dataSource.initialize();
        await dataSource.query('DROP TABLE IF EXISTS pra_logs');
        await dataSource.query('DROP TABLE IF EXISTS pra_monitorings');
        // The tables as the PRA API before 3.2 stability created them.
        await dataSource.query(`CREATE TABLE pra_logs (
            id int NOT NULL AUTO_INCREMENT, service_name varchar(255) NOT NULL,
            action_type enum('command','query','event','system') NOT NULL, action_name varchar(255) NOT NULL,
            transaction_id varchar(255) NOT NULL, initiated_by varchar(255) NULL, creation_date timestamp NOT NULL,
            payload text NOT NULL, PRIMARY KEY (id)) ENGINE=InnoDB`);
        await dataSource.query(`CREATE TABLE pra_monitorings (
            id int NOT NULL AUTO_INCREMENT, endpoint_path varchar(255) NOT NULL,
            creation_date timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (id)) ENGINE=InnoDB`);
        await dataSource.query(
            "INSERT INTO pra_logs (service_name, action_type, action_name, transaction_id, creation_date, payload) VALUES ('pra-api','event','KeepMe','t',NOW(),'{}')",
        );
    }, 30000);

    afterAll(async () => {
        await dataSource?.query('DROP TABLE IF EXISTS pra_logs');
        await dataSource?.query('DROP TABLE IF EXISTS pra_monitorings');
        await dataSource?.destroy();
    });

    it('widens action_name without losing values, creates both indexes and is idempotent', async () => {
        jest.spyOn(console, 'log').mockImplementation(() => undefined);

        await alignPraLogsAndAddRetentionIndexes(dataSource);
        await alignPraLogsAndAddRetentionIndexes(dataSource);

        const column: unknown = await dataSource.query(
            "SELECT CHARACTER_MAXIMUM_LENGTH AS length FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pra_logs' AND COLUMN_NAME = 'action_name'",
        );
        const kept: unknown = await dataSource.query("SELECT COUNT(*) AS n FROM pra_logs WHERE action_name = 'KeepMe'");
        const indexes: unknown = await dataSource.query(
            "SELECT DISTINCT INDEX_NAME AS name FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('pra_logs', 'pra_monitorings') AND INDEX_NAME LIKE 'IDX_%' ORDER BY name",
        );

        expect(Number((column as { length: string }[])[0]?.length)).toBe(1000);
        expect(Number((kept as { n: string }[])[0]?.n)).toBe(1);
        expect((indexes as { name: string }[]).map((index) => index.name)).toEqual([
            'IDX_pra_logs_creation_date',
            'IDX_pra_monitorings_creation_date',
        ]);
    }, 30000);

    it('leaves nothing for TypeORM to change afterwards', async () => {
        const queries: string[] = [];
        const synchronizing = new DataSource({
            ...options,
            entities: [LogEntity, MonitoringRecordEntity],
            logging: ['schema'],
            logger: {
                logQuery: (query: string) => queries.push(query),
                logQueryError: () => undefined,
                logQuerySlow: () => undefined,
                logSchemaBuild: (message: string) => queries.push(message),
                logMigration: () => undefined,
                log: () => undefined,
            },
        });
        await synchronizing.initialize();
        await synchronizing.synchronize(false);
        await synchronizing.destroy();

        expect(queries.filter((query) => /^(ALTER|CREATE|DROP)/i.test(query.trim()))).toEqual([]);
    }, 30000);
});
