import { DataSource } from 'typeorm';

/**
 * Run critical data migrations BEFORE NestJS/TypeORM initializes
 * This is necessary when migrations need to fix data that would otherwise
 * cause TypeORM initialization to fail (e.g., invalid enum values)
 */
export async function runMigrationsBeforeStartup(): Promise<void> {
    // Check if we're in production mode
    const isProduction = process.env.NODE_ENV === 'production';

    if (!isProduction) {
        console.log('⏭️  Development mode - skipping pre-startup migrations');
        return;
    }

    console.log('🔧 Running pre-startup migrations...');

    // Create a temporary DataSource connection (before TypeORM initializes)
    const tempDataSource = new DataSource({
        type: 'mysql',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        username: process.env.DB_USERNAME || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_DATABASE || 'pra',
    });

    try {
        await tempDataSource.initialize();
        console.log('✅ Connected to database for pre-startup migrations');

        // Migration: Replace deprecated 'DI' business unit with 'MC'
        await migrateBusinessUnitDItoMC(tempDataSource);

        console.log('✅ Pre-startup migrations completed successfully');
    } catch (error) {
        console.error('❌ Pre-startup migrations failed:', error);
        // Don't throw - let the application continue startup
        // The error will be logged and visible in pod logs
    } finally {
        if (tempDataSource.isInitialized) {
            await tempDataSource.destroy();
            console.log('🔌 Closed pre-startup migration database connection');
        }
    }
}

async function migrateBusinessUnitDItoMC(dataSource: DataSource): Promise<void> {
    console.log('🔍 Checking for customers with deprecated DI business unit...');

    try {
        // Check if any customers have DI business unit
        const result: Array<{ count: number }> = await dataSource.query(
            `SELECT COUNT(*) as count FROM pra_customers WHERE business_unit = 'DI'`,
        );

        const count = result[0]?.count || 0;

        if (count === 0) {
            console.log('✅ No customers with DI business unit found - migration not needed');
            return;
        }

        console.log(`📝 Found ${count} customer(s) with DI business unit - migrating to MC...`);

        // Update DI to MC
        await dataSource.query(`UPDATE pra_customers SET business_unit = 'MC' WHERE business_unit = 'DI'`);

        // Verify migration
        const verification: Array<{ count: number }> = await dataSource.query(
            `SELECT COUNT(*) as count FROM pra_customers WHERE business_unit = 'DI'`,
        );

        const remainingCount = verification[0]?.count || 0;

        if (remainingCount > 0) {
            throw new Error(`Migration verification failed: ${remainingCount} customers still have DI business unit`);
        }

        console.log(`✅ Successfully migrated ${count} customer(s) from DI to MC business unit`);
    } catch (error) {
        console.error('❌ Business unit migration failed:', error);
        throw error;
    }
}
