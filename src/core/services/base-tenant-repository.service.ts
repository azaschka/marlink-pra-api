import { NotFoundException } from '@nestjs/common';
import { DataSource, EntityMetadataNotFoundError, EntitySchema, FindOptionsOrder, FindOptionsWhere } from 'typeorm';
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
            const repository = this.getTenantRepository(tenantId);
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
            const repository = this.getTenantRepository(tenantId);
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
        const repository = this.getTenantRepository(tenantId);
        const queryRunner = await this.createQueryRunnerAndConnect();

        try {
            const entity = await repository.findOne({
                where: where,
            });

            return entity as T | null;
        } finally {
            await queryRunner.release();
        }
    }

    public async findBy<K extends Extract<keyof T, string>>(
        tenantId: number,
        where: Pick<T, K> | FindOptionsWhere<T>,
        pageNumber: number | undefined,
        pageSize: number | undefined,
        order?: FindOptionsOrder<() => T>,
    ): Promise<T[]> {
        const repository = this.getTenantRepository(tenantId);
        const queryRunner = await this.createQueryRunnerAndConnect();

        try {
            const entities = await repository.find({
                where: where,
                skip: pageNumber && pageSize ? (pageNumber - 1) * pageSize : undefined,
                take: pageSize,
                order: order,
            });

            return entities as T[];
        } finally {
            await queryRunner.release();
        }
    }

    public async deleteBy<K extends Extract<keyof T, string>>(
        tenantId: number,
        where: Pick<T, K> | FindOptionsWhere<T>,
    ): Promise<void> {
        const repository = this.getTenantRepository(tenantId);
        const queryRunner = await this.createQueryRunnerAndConnect();
        await queryRunner.startTransaction();

        try {
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
        const repository = this.getTenantRepository(tenantId);
        const queryRunner = await this.createQueryRunnerAndConnect();

        try {
            return await repository.count({ where });
        } finally {
            await queryRunner.release();
        }
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

    private getTenantRepository(tenantId: number) {
        try {
            const entitySchema = this.tenantEntitySchemaFactory.create(tenantId);

            const repository = this.dataSource.getRepository(entitySchema);

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
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();

        return queryRunner;
    }
}
