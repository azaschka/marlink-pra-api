import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { LogService } from '../../log/services/log.service';
import { ResetDataResult } from '../models';

@Injectable()
export class DatabaseResetService {
    private static readonly RESET_ACTION_NAME = 'MAINTENANCE_RESET_DATA';
    private static readonly VALID_TABLE_NAME_PATTERN = /^[A-Za-z0-9_]+$/;

    private readonly logger = new Logger(DatabaseResetService.name);

    constructor(
        @InjectDataSource() private readonly dataSource: DataSource,
        private readonly appConfigService: AppConfigService,
        private readonly logService: LogService,
    ) {}

    /**
     * Dry-run: returns the tables that would be truncated without changing
     * anything in the database.
     *
     * Note: BeyondTrust backup files on the storage volume are NOT deleted
     * because pra-api only has read access to the filesystem. The DB rows in
     * `beyondtrust_instance_backups` are truncated, but the physical files
     * become orphaned and must be cleaned up manually by the data-centre team.
     */
    public async previewReset(): Promise<ResetDataResult> {
        const { truncatedTables, keptTables } = await this.resolveTables();

        return {
            dryRun: true,
            truncatedTables,
            keptTables,
        };
    }

    /**
     * Truncates every table that is not on the keep-list, resetting each
     * table's AUTO_INCREMENT / primary key counter back to 1.
     *
     * Note: BeyondTrust backup files are NOT deleted (read-only filesystem).
     * The `beyondtrust_instance_backups` table is truncated; the physical
     * `.nsb` files become orphaned on the storage volume.
     */
    public async executeReset(initiatedBy: string, transactionId: string): Promise<ResetDataResult> {
        const { truncatedTables, keptTables } = await this.resolveTables();

        await this.truncateTables(truncatedTables);

        const result: ResetDataResult = {
            dryRun: false,
            truncatedTables,
            keptTables,
        };

        // Written AFTER the truncate so the audit entry survives the wipe of pra_logs.
        await this.logService.log(
            DatabaseResetService.RESET_ACTION_NAME,
            transactionId,
            initiatedBy,
            JSON.stringify(result),
        );

        this.logger.warn(
            `Data reset executed by "${initiatedBy}" (transactionId=${transactionId}): ` +
                `${truncatedTables.length} tables truncated.`,
        );

        return result;
    }

    private async resolveTables(): Promise<{ truncatedTables: string[]; keptTables: string[] }> {
        const allTables = await this.getAllBaseTableNames();
        const keepSet = new Set(this.appConfigService.maintenance.resetKeepTables.map((table) => table.toLowerCase()));

        const truncatedTables: string[] = [];
        const keptTables: string[] = [];

        for (const table of allTables) {
            if (keepSet.has(table.toLowerCase())) {
                keptTables.push(table);
            } else {
                truncatedTables.push(table);
            }
        }

        return { truncatedTables, keptTables };
    }

    private async getAllBaseTableNames(): Promise<string[]> {
        const rows = await this.dataSource.query<{ tableName: string }[]>(
            `SELECT table_name AS tableName
             FROM information_schema.tables
             WHERE table_schema = DATABASE()
               AND table_type = 'BASE TABLE'
             ORDER BY table_name`,
        );

        return rows.map((row) => row.tableName).filter((name) => this.isValidTableName(name));
    }

    private async truncateTables(tables: string[]): Promise<void> {
        if (tables.length === 0) {
            return;
        }

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();

        try {
            // TRUNCATE cannot run against tables referenced by foreign keys unless
            // checks are disabled. The flag is scoped to this single connection/session.
            await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');

            for (const table of tables) {
                if (!this.isValidTableName(table)) {
                    // Defensive: names come from information_schema, but never
                    // interpolate an unexpected identifier into raw SQL.
                    continue;
                }

                await queryRunner.query(`TRUNCATE TABLE \`${table}\``);
            }
        } finally {
            try {
                await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
            } finally {
                await queryRunner.release();
            }
        }
    }

    private isValidTableName(tableName: string): boolean {
        return DatabaseResetService.VALID_TABLE_NAME_PATTERN.test(tableName);
    }
}
