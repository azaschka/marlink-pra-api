/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { DataSource } from 'typeorm';

/**
 * Run critical data migrations BEFORE NestJS/TypeORM initializes
 * This is necessary when migrations need to fix data that would otherwise
 * cause TypeORM initialization to fail (e.g., invalid enum values)
 */
export async function runMigrationsBeforeStartup(): Promise<void> {
    // Check if we're in production mode
    // const isProduction = process.env.ENV === 'production';

    // if (!isProduction) {
    //     console.log('⏭️  Development mode - skipping pre-startup migrations');
    //     return;
    // }

    console.log('🔧 Running pre-startup migrations...');

    // Create a temporary DataSource connection (before TypeORM initializes)
    const tempDataSource = new DataSource({
        type: 'mysql',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        username: process.env.DB_USERNAME || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'pra',
    });

    try {
        await tempDataSource.initialize();
        console.log('✅ Connected to database for pre-startup migrations');

        // Add future migrations here as needed
        // Example:
        // await migrateSomethingNew(tempDataSource);

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
