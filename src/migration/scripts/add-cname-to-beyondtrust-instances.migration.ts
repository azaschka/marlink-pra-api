import { DataSource } from 'typeorm';

/**
 * Migration: Add cname column to beyondtrust_instances table
 *
 * The cname is a full HTTPS URL (e.g. https://pra.marlink.com) that is displayed
 * to end-users in activation / new-password emails instead of the raw BeyondTrust
 * cloud URL.  It is stored only in PRA API and is not forwarded to Sync API.
 */
export async function addCnameToBeyondtrustInstances(dataSource: DataSource): Promise<void> {
    console.log('🔧 Starting migration: add cname column to beyondtrust_instances...');

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
        const columnExists = await queryRunner.hasColumn('beyondtrust_instances', 'cname');

        if (columnExists) {
            console.log('✅ Migration already applied - cname column already exists on beyondtrust_instances');
            await queryRunner.commitTransaction();
            return;
        }

        console.log('➕ Adding cname column to beyondtrust_instances...');
        await queryRunner.query(`
            ALTER TABLE beyondtrust_instances
            ADD COLUMN cname VARCHAR(255) NULL DEFAULT NULL;
        `);
        console.log('✅ cname column added to beyondtrust_instances (existing rows set to NULL)');

        await queryRunner.commitTransaction();
        console.log('✅ Migration completed successfully');
    } catch (error) {
        console.error('❌ Migration failed, rolling back...');
        await queryRunner.rollbackTransaction();
        console.error('Error details:', error);
        throw error;
    } finally {
        await queryRunner.release();
    }
}
