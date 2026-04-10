import { DataSource } from 'typeorm';

/**
 * Migration: Move customer business unit (BU) to BT instance business unit (BU)
 */
export async function migrateCustomerBUToBTInstanceBU(dataSource: DataSource): Promise<void> {
    console.log('🔧 Starting migration: move customer BU to BT instance BU...');

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
        // Check if migration has already been applied by looking for the existence of the new column
        const doesBTInstanceBUColumnExist = await queryRunner.hasColumn('beyondtrust_instances', 'business_unit');

        if (doesBTInstanceBUColumnExist) {
            console.log('✅ Migration already applied - business_unit (beyondtrust_instances) column already exists');
            await queryRunner.commitTransaction();
            return;
        }

        // Add the new column to beyondtrust_instances — defaults to NULL for all existing rows
        console.log('➕ Adding business_unit column to beyondtrust_instances...');
        await queryRunner.query(`
            ALTER TABLE beyondtrust_instances
            ADD COLUMN business_unit ENUM('MT','OA','MC','EG','TE') NULL;
        `);
        console.log('✅ business_unit column added to beyondtrust_instances (all existing rows set to NULL)');

        console.log('✅ Migration completed successfully');
        console.log('BT instance business unit set to NULL for all existing instances (NULL = shared across all BUs)');
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
