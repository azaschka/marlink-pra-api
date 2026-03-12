/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
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
        // Check if migration has already been applied by looking for the existence of the old column
        const doesCustomerBUColumnExist = await queryRunner.hasColumn('pra_customers', 'business_unit');

        if (!doesCustomerBUColumnExist) {
            console.log('✅ Migration already applied - business_unit (pra_customers) column does not exist');
            await queryRunner.commitTransaction();
            return;
        }

        // Check if the new column already exists in beyondtrust_instances
        const doesBTInstanceBUColumnExist = await queryRunner.hasColumn('beyondtrust_instances', 'business_unit');

        if (!doesBTInstanceBUColumnExist) {
            console.error(
                '❌ Migration failed - new column business_unit does not exist in beyondtrust_instances. Please ensure marlink-pra-sync-api is deployed with the latest version before running this API.',
            );

            await queryRunner.release();

            // Prevent the application to run.
            process.exit(1);
        }

        // Get table info to check for data
        const dataCount = await queryRunner.query('SELECT COUNT(*) as count FROM pra_customers');
        const recordCount = Number(dataCount[0]?.count ?? 0);
        console.log(`📊 Found ${recordCount} customer's business unit records to migrate`);

        // Copy BU from pra_customers.business_unit to beyondtrust_instances.business_unit
        await queryRunner.query(`
            UPDATE beyondtrust_instances bt
            JOIN pra_customers c 
            ON c.beyondtrust_instance_id = bt.id
            SET bt.business_unit = c.business_unit;
        `);

        // Delete pra_customers.business_unit column after migration
        await queryRunner.query(`
            ALTER TABLE pra_customers
            DROP COLUMN business_unit;
        `);

        console.log('✅ Migration completed successfully');
        console.log(
            'Customer business unit has been moved to BT instance business unit and customer business unit column has been removed',
        );
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
