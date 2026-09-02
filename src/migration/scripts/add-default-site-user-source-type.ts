import { DataSource } from 'typeorm';

/**
 * Migration: Add default sourceType column (internal) to site users (site auditors, site manager, site support team members)
 */
export async function addDefaultSiteUserSourceType(dataSource: DataSource): Promise<void> {
    console.log('🔧 Starting migration: add default sourceType column (internal) to site users...');

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const siteUserTables = ['pra_site_auditors', 'pra_site_managers', 'pra_site_support_team_members'];

    for (const tableName of siteUserTables) {
        try {
            // Check if migration has already been applied by looking for the existence of the new column
            const doesSourceTypeColumnExist = await queryRunner.hasColumn(tableName, 'source_type');

            if (doesSourceTypeColumnExist) {
                console.log('✅ Migration already applied - source_type column already exists');
                await queryRunner.commitTransaction();
                return;
            }

            // Add the new column to the current site user table — defaults to "internal" for all existing rows
            console.log(`Adding source_type column to ${tableName}...`);
            await queryRunner.query(`
            ALTER TABLE ${tableName}
            ADD COLUMN source_type ENUM('internal','external') NOT NULL DEFAULT 'internal';
        `);
            console.log(`✅ source_type column added to ${tableName} (all existing rows set to internal)`);

            console.log('✅ Migration completed successfully');
            console.log(`source_type set to internal for all existing rows in ${tableName}`);
            await queryRunner.commitTransaction();
        } catch (error) {
            console.error('❌ Migration failed, rolling back...');
            await queryRunner.rollbackTransaction();
            console.error('Error details:', error);
            throw error;
        } finally {
            await queryRunner.release();
        }
    }
}
