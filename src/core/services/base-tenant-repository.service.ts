import { NotFoundException } from '@nestjs/common';
import {
    DataSource,
    EntityMetadataNotFoundError,
    EntitySchema,
    FindOptionsOrder,
    FindOptionsWhere,
    QueryRunner,
} from 'typeorm';
import { DatabaseConnectionUtility } from '../../shared/utilities/database-connection.utility';
import { BaseTenantEntitySchemaFactory } from '../factories';

export class BaseTenantRepositoryService<T> {
    constructor(
        protected readonly dataSource: DataSource,
        private readonly tenantEntitySchemaFactory: BaseTenantEntitySchemaFactory<T>,
    ) {}

    public async createAndConnectTable(tenantId: number): Promise<{ tableName: string }> {
        const entitySchema = this.tenantEntitySchemaFactory.create(tenantId);

        // Dynamically register the entity if not already registered
        if (
            Array.isArray(this.dataSource.options.entities) &&
            !this.dataSource.options.entities
                .map((e) => (e as EntitySchema<T>).options?.name)
                .includes(entitySchema.options.name)
        ) {
            this.dataSource.options.entities.push(entitySchema);

            // Since we're using 1 db = 1 data source, we can safely check relations for all entities here.
            if (this.canBuildMetadataAndSync()) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                await this.dataSource.buildMetadatas();
                await this.dataSource.synchronize(false); // dropBeforeSync = false
            }
        }

        return { tableName: entitySchema.options.name };
    }

    public async create(tenantId: number, entity: Partial<T>): Promise<T> {
        const queryRunner = await this.createQueryRunnerAndConnect();
        await queryRunner.startTransaction();

        try {
            const repository = this.getTenantRepository(tenantId, queryRunner);
            const createdEntity = repository.create(entity);
            await repository.save(createdEntity);
            await queryRunner.commitTransaction();

            return createdEntity as T;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    public async createOrUpdate<K extends Extract<keyof T, string>>(
        tenantId: number,
        entityOrEntities: Partial<T> | Partial<T>[],
        conflictPaths: K[],
    ): Promise<void> {
        const queryRunner = await this.createQueryRunnerAndConnect();
        await queryRunner.startTransaction();

        try {
            const repository = this.getTenantRepository(tenantId, queryRunner);
            await repository.upsert(entityOrEntities, {
                conflictPaths,
            });
            await queryRunner.commitTransaction();
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    public async findOneBy<K extends Extract<keyof T, string>>(tenantId: number, where: Pick<T, K>): Promise<T | null> {
        this.assertTenantIsRegistered(tenantId);

        return DatabaseConnectionUtility.executeRead(this.dataSource, async (queryRunner) => {
            const repository = this.getTenantRepository(tenantId, queryRunner);
            const entity = await repository.findOne({
                where: where,
            });

            return entity as T | null;
        });
    }

    public async findBy<K extends Extract<keyof T, string>>(
        tenantId: number,
        where: Pick<T, K> | FindOptionsWhere<T>,
        pageNumber: number | undefined,
        pageSize: number | undefined,
        order?: FindOptionsOrder<() => T>,
    ): Promise<T[]> {
        this.assertTenantIsRegistered(tenantId);

        return DatabaseConnectionUtility.executeRead(this.dataSource, async (queryRunner) => {
            const repository = this.getTenantRepository(tenantId, queryRunner);
            const entities = await repository.find({
                where: where,
                skip: pageNumber && pageSize ? (pageNumber - 1) * pageSize : undefined,
                take: pageSize,
                order: order,
            });

            return entities as T[];
        });
    }

    public async deleteBy<K extends Extract<keyof T, string>>(
        tenantId: number,
        where: Pick<T, K> | FindOptionsWhere<T>,
    ): Promise<void> {
        this.assertTenantIsRegistered(tenantId);
        const queryRunner = await this.createQueryRunnerAndConnect();
        await queryRunner.startTransaction();

        try {
            const repository = this.getTenantRepository(tenantId, queryRunner);
            await repository.delete(where);
            await queryRunner.commitTransaction();
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    public async countBy<K extends Extract<keyof T, string>>(
        tenantId: number,
        where: Pick<T, K> | FindOptionsWhere<T>,
    ): Promise<number> {
        this.assertTenantIsRegistered(tenantId);

        return DatabaseConnectionUtility.executeRead(this.dataSource, (queryRunner) =>
            this.getTenantRepository(tenantId, queryRunner).count({ where }),
        );
    }

    private canBuildMetadataAndSync(): boolean {
        const entities = (this.dataSource.options.entities as EntitySchema[]).filter(
            (entity) => entity.options !== undefined,
        );
        const entityRelations = entities.flatMap((entity) => Object.values(entity.options.relations ?? {}));
        const allRelationTargets = entityRelations.map((relation) => relation?.target as string);
        const allEntityNames = entities.map((entity) => entity.options.name);

        return allRelationTargets.every((target) => allEntityNames.includes(target));
    }

    private assertTenantIsRegistered(tenantId: number): void {
        this.getTenantRepository(tenantId);
    }

    // Bind to the query runner when given, otherwise each call takes a second pooled connection.
    private getTenantRepository(tenantId: number, queryRunner?: QueryRunner) {
        try {
            const entitySchema = this.tenantEntitySchemaFactory.create(tenantId);

            const repository = queryRunner
                ? queryRunner.manager.getRepository(entitySchema)
                : this.dataSource.getRepository(entitySchema);

            // This will trigger EntityMetadataNotFoundError if the repository is not found.
            // The console.log won't be executed but it's there for tslinting purposes.
            if (!repository.metadata) {
                console.log(`Repository metadata not found for tenantId ${tenantId}`);
            }

            return repository;
        } catch (error) {
            if (error instanceof EntityMetadataNotFoundError) {
                throw new NotFoundException(`Tenant with ID ${tenantId} is not registered.`);
            }

            throw error;
        }
    }

    private async createQueryRunnerAndConnect() {
        return DatabaseConnectionUtility.acquireQueryRunner(this.dataSource);
    }
}
