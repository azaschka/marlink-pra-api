import { DataSource, QueryRunner } from 'typeorm';

const SITE_USER_TABLE_NAMES = ['pra_site_auditors', 'pra_site_managers', 'pra_site_support_team_members'];
const SOURCE_TYPE_COLUMN_NAME = 'source_type';

/**
 * Migration: Add default sourceType column (internal) to site users (site auditors, site managers, site support team members)
 *
 * Each table is handled by its own query runner. A shared query runner cannot be used here: the previous
 * implementation committed and released inside the table loop, so every table after the first one ran against
 * an already released connection and silently kept its missing column.
 *
 * The per-table existence check makes the migration re-runnable and self-repairing: tables that already have
 * the column are skipped, tables that are still missing it are patched on the next startup.
 */
export async function addDefaultSiteUserSourceType(dataSource: DataSource): Promise<void> {
    console.log('🔧 Starting migration: add default sourceType column (internal) to site users...');

    for (const tableName of SITE_USER_TABLE_NAMES) {
        await addSourceTypeColumnToTable(dataSource, tableName);
    }

    await verifySourceTypeColumnExists(dataSource);
}

async function addSourceTypeColumnToTable(dataSource: DataSource, tableName: string): Promise<void> {
    const queryRunner = dataSource.createQueryRunner();

    try {
        await queryRunner.connect();

        if (await hasSourceTypeColumn(queryRunner, tableName)) {
            console.log(`✅ Migration already applied for ${tableName} - ${SOURCE_TYPE_COLUMN_NAME} column exists`);

            return;
        }

        console.log(`Adding ${SOURCE_TYPE_COLUMN_NAME} column to ${tableName}...`);

        // DDL statements are implicitly committed by MariaDB, so wrapping this in a transaction would only
        // create the illusion of a rollback. Idempotency is provided by the existence check above instead.
        await queryRunner.query(`
            ALTER TABLE \`${tableName}\`
            ADD COLUMN \`${SOURCE_TYPE_COLUMN_NAME}\` ENUM('internal','external') NOT NULL DEFAULT 'internal';
        `);

        console.log(`✅ ${SOURCE_TYPE_COLUMN_NAME} column added to ${tableName} (all existing rows set to internal)`);
    } catch (error) {
        console.error(`❌ Failed to add ${SOURCE_TYPE_COLUMN_NAME} column to ${tableName}:`, error);
    } finally {
        await queryRunner.release();
    }
}

/**
 * The caller intentionally swallows migration errors to keep the application starting up. Without this check a
 * partially applied migration would stay invisible until the first site write fails, because the site user
 * entities declare source_type as a non-nullable column.
 */
async function verifySourceTypeColumnExists(dataSource: DataSource): Promise<void> {
    const queryRunner = dataSource.createQueryRunner();
    const tableNamesWithoutColumn: string[] = [];

    try {
        await queryRunner.connect();

        for (const tableName of SITE_USER_TABLE_NAMES) {
            if (!(await hasSourceTypeColumn(queryRunner, tableName))) {
                tableNamesWithoutColumn.push(tableName);
            }
        }
    } finally {
        await queryRunner.release();
    }

    if (tableNamesWithoutColumn.length > 0) {
        console.error(
            `❌ MIGRATION INCOMPLETE - ${SOURCE_TYPE_COLUMN_NAME} column is missing on: ${tableNamesWithoutColumn.join(', ')}. ` +
                'Site creation and site modification will fail until this is resolved.',
        );

        return;
    }

    console.log(
        `✅ Migration completed successfully - ${SOURCE_TYPE_COLUMN_NAME} column exists on all site user tables`,
    );
}

async function hasSourceTypeColumn(queryRunner: QueryRunner, tableName: string): Promise<boolean> {
    if (!(await queryRunner.hasTable(tableName))) {
        // The table is created by TypeORM after the pre-startup migrations have run. A missing table is therefore
        // not an error: the column is part of the entity definition and will be created together with the table.
        console.log(`⏭️  Table ${tableName} does not exist yet - skipping`);

        return true;
    }

    return await queryRunner.hasColumn(tableName, SOURCE_TYPE_COLUMN_NAME);
}
