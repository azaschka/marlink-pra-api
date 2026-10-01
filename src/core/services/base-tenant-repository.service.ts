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
    /**
     * The entity schema each tenant was registered with. TypeORM caches repositories by the identity of the
     * target object, so every lookup must use the very schema object that was registered. Creating a new
     * schema per call adds a permanent repository cache entry per call. Only registered tenants are kept,
     * so the map is bounded by the number of registered BeyondTrust instances.
     */
    private readonly registeredSchemas = new Map<number, EntitySchema<T>>();

    constructor(
        protected readonly dataSource: DataSource,
        private readonly tenantEntitySchemaFactory: BaseTenantEntitySchemaFactory<T>,
    ) {}

    public async createAndConnectTable(tenantId: number): Promise<{ tableName: string }> {
        const entitySchema = this.tenantEntitySchemaFactory.create(tenantId);
        const registeredSchema = this.findRegisteredSchema(entitySchema.options.name);

        if (registeredSchema) {
            this.registeredSchemas.set(tenantId, registeredSchema);

            return { tableName: registeredSchema.options.name };
        }

        // Dynamically register the entity if not already registered
        if (Array.isArray(this.dataSource.options.entities)) {
            this.dataSource.options.entities.push(entitySchema);

            // Since we're using 1 db = 1 data source, we can safely check relations for all entities here.
            if (this.canBuildMetadataAndSync()) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                await this.dataSource.buildMetadatas();
                await this.dataSource.synchronize(false); // dropBeforeSync = false
            }

            this.registeredSchemas.set(tenantId, entitySchema);
        }

        return { tableName: entitySchema.options.name };
    }

    public async create(tenantId: number, entity: Partial<T>): Promise<T> {
        return DatabaseConnectionUtility.executeInTransaction(this.dataSource, async (queryRunner) => {
            const repository = this.getTenantRepository(tenantId, queryRunner);
            const createdEntity = repository.create(entity);
            await repository.save(createdEntity);

            return createdEntity as T;
        });
    }

    public async createOrUpdate<K extends Extract<keyof T, string>>(
        tenantId: number,
        entityOrEntities: Partial<T> | Partial<T>[],
        conflictPaths: K[],
    ): Promise<void> {
        await DatabaseConnectionUtility.executeInTransaction(this.dataSource, async (queryRunner) => {
            const repository = this.getTenantRepository(tenantId, queryRunner);
            await repository.upsert(entityOrEntities, {
                conflictPaths,
            });
        });
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

        await DatabaseConnectionUtility.executeInTransaction(this.dataSource, async (queryRunner) => {
            const repository = this.getTenantRepository(tenantId, queryRunner);
            await repository.delete(where);
        });
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

    // Fails fast before a pooled connection is taken. Neither creates a repository nor a cache entry.
    private assertTenantIsRegistered(tenantId: number): void {
        const entitySchema = this.resolveRegisteredSchema(tenantId);

        if (!this.dataSource.hasMetadata(entitySchema.options.name)) {
            throw this.tenantNotRegistered(tenantId);
        }
    }

    // Bind to the query runner when given, otherwise each call takes a second pooled connection.
    private getTenantRepository(tenantId: number, queryRunner?: QueryRunner) {
        const entitySchema = this.resolveRegisteredSchema(tenantId);

        try {
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
                throw this.tenantNotRegistered(tenantId);
            }

            throw error;
        }
    }

    /**
     * Returns the schema the tenant was registered with. A schema registered by another instance of the same
     * repository service is adopted; an unknown tenant is rejected without caching anything for it.
     */
    private resolveRegisteredSchema(tenantId: number): EntitySchema<T> {
        const cachedSchema = this.registeredSchemas.get(tenantId);

        if (cachedSchema) {
            return cachedSchema;
        }

        const expectedName = this.tenantEntitySchemaFactory.create(tenantId).options.name;
        const registeredSchema = this.findRegisteredSchema(expectedName);

        if (!registeredSchema) {
            throw this.tenantNotRegistered(tenantId);
        }

        this.registeredSchemas.set(tenantId, registeredSchema);

        return registeredSchema;
    }

    private findRegisteredSchema(name: string): EntitySchema<T> | undefined {
        const entities = this.dataSource.options.entities;

        if (!Array.isArray(entities)) {
            return undefined;
        }

        return entities.find((entity): entity is EntitySchema<T> => (entity as EntitySchema<T>).options?.name === name);
    }

    private tenantNotRegistered(tenantId: number): NotFoundException {
        return new NotFoundException(`Tenant with ID ${tenantId} is not registered.`);
    }
}
