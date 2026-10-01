import { DataSource } from 'typeorm';

interface IndexTarget {
    readonly table: string;
    readonly index: string;
    readonly column: string;
}

/**
 * Migration (STAB-08): prepares pra_logs and pra_monitorings for the batched retention.
 *
 * 1. pra_logs.action_name becomes varchar(1000), the length of both service definitions. It used to be 255 in
 *    PRA API and 1000 in Sync API; TypeORM changes a length by DROP and ADD COLUMN, which lost every value each
 *    time the other service synchronised. MODIFY keeps the values.
 * 2. Indexes on creation_date for both tables, created online (ALGORITHM=INPLACE, LOCK=NONE), so the retention
 *    deletes and the log queries do not scan the whole table. On a large pra_logs this takes time proportional to
 *    the table size; it can be created beforehand in a maintenance window with the same statement.
 *
 * Idempotent; a step that fails is reported and does not stop the startup.
 */
export async function alignPraLogsAndAddRetentionIndexes(dataSource: DataSource): Promise<void> {
    console.log('🔧 Starting migration: align pra_logs and add retention indexes...');

    await widenActionName(dataSource);

    for (const target of [
        { table: 'pra_logs', index: 'IDX_pra_logs_creation_date', column: 'creation_date' },
        { table: 'pra_monitorings', index: 'IDX_pra_monitorings_creation_date', column: 'creation_date' },
    ]) {
        await createIndexOnline(dataSource, target);
    }
}

async function widenActionName(dataSource: DataSource): Promise<void> {
    try {
        const rows: unknown = await dataSource.query(
            `SELECT CHARACTER_MAXIMUM_LENGTH AS length FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pra_logs' AND COLUMN_NAME = 'action_name'`,
        );
        const length = Number((rows as { length?: unknown }[])[0]?.length ?? NaN);

        if (Number.isNaN(length)) {
            console.log('⏭️  pra_logs.action_name does not exist yet, nothing to align');

            return;
        }

        if (length >= 1000) {
            console.log('✅ pra_logs.action_name is already varchar(1000)');

            return;
        }

        const startedAt = Date.now();
        await dataSource.query(
            'ALTER TABLE `pra_logs` MODIFY `action_name` varchar(1000) NOT NULL, ALGORITHM=INPLACE, LOCK=NONE',
        );
        console.log(`✅ pra_logs.action_name widened to varchar(1000) in ${Date.now() - startedAt} ms, values kept`);
    } catch (error) {
        console.error('❌ Widening pra_logs.action_name failed:', error instanceof Error ? error.message : error);
    }
}

async function createIndexOnline(dataSource: DataSource, target: IndexTarget): Promise<void> {
    try {
        const tables: unknown = await dataSource.query(
            `SELECT TABLE_ROWS AS estimatedRows FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
            [target.table],
        );

        if ((tables as unknown[]).length === 0) {
            console.log(`⏭️  ${target.table} does not exist yet; the index is created with the table`);

            return;
        }

        const indexes: unknown = await dataSource.query(
            `SELECT 1 FROM information_schema.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
            [target.table, target.index],
        );

        if ((indexes as unknown[]).length > 0) {
            console.log(`✅ Index ${target.index} already exists`);

            return;
        }

        const estimatedRows = Number((tables as { estimatedRows?: unknown }[])[0]?.estimatedRows ?? 0);
        console.log(`➕ Creating index ${target.index} online on about ${estimatedRows} rows...`);
        const startedAt = Date.now();
        await dataSource.query(
            `CREATE INDEX \`${target.index}\` ON \`${target.table}\` (\`${target.column}\`) ALGORITHM=INPLACE LOCK=NONE`,
        );
        console.log(`✅ Index ${target.index} created in ${Date.now() - startedAt} ms`);
    } catch (error) {
        console.error(`❌ Creating index ${target.index} failed:`, error instanceof Error ? error.message : error);
    }
}
