import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityMetadata } from 'typeorm';
import { AppConfigService } from '../../app-config/services/app-config.service';

interface IndexDefinition {
    name: string;
    columns: string[];
    unique: boolean;
}

@Injectable()
export class MigrationService {
    private readonly logger = new Logger(MigrationService.name);

    constructor(
        @InjectDataSource() private readonly dataSource: DataSource,
        private readonly appConfigService: AppConfigService,
    ) {}

    public async runMigrations(): Promise<void> {
        // Skip migrations in development (synchronize: true handles it)
        if (!this.appConfigService.isProduction) {
            this.logger.log('Development mode detected - skipping migrations (synchronize enabled)');
            return;
        }

        this.logger.log('Starting database migrations...');

        try {
            await this.ensureIndexesExist();
            this.logger.log('✅ Database migrations completed successfully');
        } catch (error) {
            this.logger.error('❌ Database migrations failed', error);
            throw error;
        }
    }

    private async ensureIndexesExist(): Promise<void> {
        const entities = this.dataSource.entityMetadatas;
        let indexesCreated = 0;
        let indexesSkipped = 0;

        for (const entity of entities) {
            const tableName = entity.tableName;
            const existingIndexes = await this.getExistingIndexes(tableName);

            // Create indexes from entity metadata
            for (const index of this.getRequiredIndexes(entity)) {
                const indexExists = existingIndexes.some((existing: { name: string }) => existing.name === index.name);

                if (indexExists) {
                    this.logger.debug(`Index ${index.name} already exists on ${tableName}`);
                    indexesSkipped++;
                    continue;
                }

                try {
                    await this.createIndex(tableName, index);
                    this.logger.log(`✅ Created index ${index.name} on ${tableName}`);
                    indexesCreated++;
                } catch (error) {
                    this.logger.warn(`Failed to create index ${index.name} on ${tableName}: ${error}`);
                }
            }
        }

        this.logger.log(`Index creation summary: ${indexesCreated} created, ${indexesSkipped} already existed`);

        // Update table statistics for query optimizer
        if (indexesCreated > 0) {
            await this.updateTableStatistics(entities.map((e: EntityMetadata) => e.tableName));
        }
    }

    private getRequiredIndexes(entity: EntityMetadata): IndexDefinition[] {
        const indexes: IndexDefinition[] = [];

        // Add indexes from @Index decorators
        entity.indices.forEach((index) => {
            const indexName =
                index.name || `IDX_${entity.tableName}_${index.columns.map((c) => c.propertyName).join('_')}`;
            indexes.push({
                name: indexName,
                columns: index.columns.map((c) => c.databaseName),
                unique: index.isUnique || false,
            });
        });

        // Add indexes for unique columns (those marked with @Column({ unique: true }))
        entity.columns.forEach((column) => {
            // Check if column has unique constraint and is not a primary key
            const uniqueMetadata = entity.uniques.find((u) =>
                u.columns.some((c) => c.propertyName === column.propertyName),
            );
            const isPrimary = column.isPrimary === true;

            if (uniqueMetadata && !isPrimary) {
                const indexName = `UQ_${entity.tableName}_${column.databaseName}`;
                // Check if not already added from @Index decorator
                if (!indexes.some((idx) => idx.name === indexName)) {
                    indexes.push({
                        name: indexName,
                        columns: [column.databaseName],
                        unique: true,
                    });
                }
            }
        });

        // Add indexes for foreign keys
        entity.foreignKeys.forEach((fk) => {
            const columnNames = fk.columnNames;
            const indexName = `IDX_${entity.tableName}_${columnNames.join('_')}`;
            // Check if not already added
            if (!indexes.some((idx) => idx.name === indexName)) {
                indexes.push({
                    name: indexName,
                    columns: columnNames,
                    unique: false,
                });
            }
        });

        return indexes;
    }

    private async getExistingIndexes(tableName: string): Promise<Array<{ name: string }>> {
        const query = `
            SELECT DISTINCT INDEX_NAME as name
            FROM INFORMATION_SCHEMA.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = ?
        `;

        const result: Array<{ name: string }> = await this.dataSource.query(query, [tableName]);
        return result;
    }

    private async createIndex(tableName: string, index: IndexDefinition): Promise<void> {
        const uniqueKeyword = index.unique ? 'UNIQUE' : '';
        const columnsList = index.columns.map((col) => `\`${col}\``).join(', ');

        const query = `
            CREATE ${uniqueKeyword} INDEX \`${index.name}\`
            ON \`${tableName}\` (${columnsList})
        `;

        await this.dataSource.query(query);
    }

    private async updateTableStatistics(tableNames: string[]): Promise<void> {
        this.logger.log('Updating table statistics for query optimizer...');

        for (const tableName of tableNames) {
            try {
                await this.dataSource.query(`ANALYZE TABLE \`${tableName}\``);
                this.logger.debug(`Updated statistics for ${tableName}`);
            } catch (error) {
                this.logger.warn(`Failed to update statistics for ${tableName}: ${error}`);
            }
        }
    }
}
