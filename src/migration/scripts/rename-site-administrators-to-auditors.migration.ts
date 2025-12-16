/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { DataSource } from 'typeorm';

/**
 * Migration: Rename pra_site_administrators table to pra_site_auditors
 *
 * This migration renames the site administrators table to site auditors to match
 * the updated terminology used in the frontend.
 *
 * Changes:
 * - Renames table from pra_site_administrators to pra_site_auditors
 * - Updates all indexes and constraints
 * - Preserves all data and relationships
 */
export async function migrateSiteAdministratorsToAuditors(dataSource: DataSource): Promise<void> {
    console.log('🔧 Starting migration: Rename site_administrators to site_auditors...');

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
        // Check if old table exists
        const oldTableExists = await queryRunner.hasTable('pra_site_administrators');
        const newTableExists = await queryRunner.hasTable('pra_site_auditors');

        if (!oldTableExists && newTableExists) {
            console.log('✅ Migration already applied - pra_site_auditors table exists');
            await queryRunner.commitTransaction();
            return;
        }

        if (!oldTableExists && !newTableExists) {
            console.log('⚠️  Neither table exists - skipping migration');
            await queryRunner.commitTransaction();
            return;
        }

        // Get table info to check for data
        const dataCount = await queryRunner.query('SELECT COUNT(*) as count FROM pra_site_administrators');
        const recordCount = Number(dataCount[0]?.count ?? 0);
        console.log(`📊 Found ${recordCount} site administrator records to migrate`);

        // Rename the table
        await queryRunner.query('RENAME TABLE pra_site_administrators TO pra_site_auditors');
        console.log('✅ Renamed table: pra_site_administrators → pra_site_auditors');

        // Update the unique constraint name (if it exists with old name)
        // Note: TypeORM auto-generates unique constraint names, so we need to find and rename them
        const constraints = await queryRunner.query(`
            SELECT CONSTRAINT_NAME 
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'pra_site_auditors' 
            AND CONSTRAINT_TYPE = 'UNIQUE'
            AND CONSTRAINT_NAME LIKE '%site_administrator%'
        `);

        for (const constraint of constraints) {
            const oldConstraintName = constraint.CONSTRAINT_NAME;
            const newConstraintName = oldConstraintName.replace('site_administrator', 'site_auditor');

            // Drop old unique constraint
            await queryRunner.query(`ALTER TABLE pra_site_auditors DROP INDEX \`${oldConstraintName}\``);

            // Recreate with new name
            await queryRunner.query(
                `ALTER TABLE pra_site_auditors ADD UNIQUE INDEX \`${newConstraintName}\` (site_id, user_id)`,
            );

            console.log(`✅ Renamed unique constraint: ${oldConstraintName} → ${newConstraintName}`);
        }

        // Update foreign key constraint names (if they reference the old table name)
        const foreignKeys = await queryRunner.query(`
            SELECT CONSTRAINT_NAME
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'pra_site_auditors'
            AND REFERENCED_TABLE_NAME IS NOT NULL
            AND CONSTRAINT_NAME LIKE '%site_administrator%'
        `);

        for (const fk of foreignKeys) {
            const oldFkName = fk.CONSTRAINT_NAME;
            const newFkName = oldFkName.replace('site_administrator', 'site_auditor');

            // Get FK details
            const fkDetails = await queryRunner.query(`
                SELECT 
                    COLUMN_NAME,
                    REFERENCED_TABLE_NAME,
                    REFERENCED_COLUMN_NAME,
                    UPDATE_RULE,
                    DELETE_RULE
                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                WHERE CONSTRAINT_SCHEMA = DATABASE()
                AND TABLE_NAME = 'pra_site_auditors'
                AND CONSTRAINT_NAME = '${oldFkName}'
            `);

            if (fkDetails.length > 0) {
                const detail = fkDetails[0];

                // Drop old FK
                await queryRunner.query(`ALTER TABLE pra_site_auditors DROP FOREIGN KEY \`${oldFkName}\``);

                // Recreate with new name
                await queryRunner.query(`
                    ALTER TABLE pra_site_auditors 
                    ADD CONSTRAINT \`${newFkName}\`
                    FOREIGN KEY (\`${detail.COLUMN_NAME}\`)
                    REFERENCES \`${detail.REFERENCED_TABLE_NAME}\` (\`${detail.REFERENCED_COLUMN_NAME}\`)
                    ON UPDATE ${detail.UPDATE_RULE}
                    ON DELETE ${detail.DELETE_RULE}
                `);

                console.log(`✅ Renamed foreign key: ${oldFkName} → ${newFkName}`);
            }
        }

        // Verify migration
        const verifyCount = await queryRunner.query('SELECT COUNT(*) as count FROM pra_site_auditors');
        const verifiedRecordCount = Number(verifyCount[0]?.count ?? 0);

        if (verifiedRecordCount !== recordCount) {
            throw new Error(
                `Migration verification failed: Expected ${recordCount} records but found ${verifiedRecordCount}`,
            );
        }

        await queryRunner.commitTransaction();
        console.log(`✅ Migration completed successfully - ${verifiedRecordCount} records preserved`);
        console.log('✅ Table renamed: pra_site_administrators → pra_site_auditors');
    } catch (error) {
        console.error('❌ Migration failed, rolling back...');
        await queryRunner.rollbackTransaction();
        console.error('Error details:', error);
        throw error;
    } finally {
        await queryRunner.release();
    }
}
