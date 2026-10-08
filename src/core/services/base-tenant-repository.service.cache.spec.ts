import { NotFoundException } from '@nestjs/common';
import { DataSource, EntitySchema, QueryRunner } from 'typeorm';
import { DatabaseConnectionUtility } from '../../shared/utilities/database-connection.utility';
import { BaseTenantEntitySchemaFactory } from '../factories';
import { BaseTenantRepositoryService } from './base-tenant-repository.service';

interface TestEntity {
    id: number;
    name: string;
}

// Like every production factory, this one returns a new schema object on every call.
class TestEntitySchemaFactory implements BaseTenantEntitySchemaFactory<TestEntity> {
    public create(tenantId: number): EntitySchema<TestEntity> {
        return new EntitySchema<TestEntity>({
            name: `test_entities_${tenantId}`,
            tableName: `test_entities_${tenantId}`,
            columns: {
                id: { name: 'id', type: 'int', primary: true, generated: true },
                name: { name: 'name', type: 'varchar' },
            },
        });
    }
}

/**
 * Regression tests for the repository cache leak: TypeORM caches repositories by the identity of the target,
 * so a new EntitySchema per call used to add one permanent cache entry per tenant read, delete and count.
 * Uses a real (not connected) TypeORM DataSource for metadata and the repository cache; only the query
 * execution is replaced.
 */
describe('BaseTenantRepositoryService repository cache', () => {
    const CALLS = 1000;

    let dataSource: DataSource;
    let service: BaseTenantRepositoryService<TestEntity>;
    let repositoryTargets: unknown[];

    const repositoryCacheSize = () =>
        (dataSource.manager as unknown as { repositories: Map<unknown, unknown> }).repositories.size;

    beforeEach(async () => {
        dataSource = new DataSource({
            type: 'mariadb',
            connectorPackage: 'mysql2',
            database: 'not-connected',
            entities: [],
        });
        jest.spyOn(dataSource, 'synchronize').mockResolvedValue(undefined);
        service = new BaseTenantRepositoryService<TestEntity>(dataSource, new TestEntitySchemaFactory());
        await service.createAndConnectTable(1);
        await service.createAndConnectTable(2);

        repositoryTargets = [];
        const queryRunner = {
            manager: {
                getRepository: (target: unknown) => {
                    repositoryTargets.push(target);
                    return {
                        metadata: {},
                        find: jest.fn().mockResolvedValue([]),
                        findOne: jest.fn().mockResolvedValue(null),
                        count: jest.fn().mockResolvedValue(0),
                        delete: jest.fn().mockResolvedValue({}),
                        upsert: jest.fn().mockResolvedValue({}),
                    };
                },
            },
        } as unknown as QueryRunner;
        jest.spyOn(DatabaseConnectionUtility, 'executeRead').mockImplementation((_dataSource, operation) =>
            operation(queryRunner),
        );
        jest.spyOn(DatabaseConnectionUtility, 'executeInTransaction').mockImplementation((_dataSource, operation) =>
            operation(queryRunner),
        );
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('does not grow the repository cache on repeated reads, deletes and counts of the same tenants', async () => {
        const cacheSizeBefore = repositoryCacheSize();

        for (let i = 0; i < CALLS; i++) {
            await service.findBy(1, { name: `n${i}` }, 1, 10);
            await service.findOneBy(2, { id: i });
            await service.countBy(1, { name: `n${i}` });
            await service.deleteBy(2, { id: i });
            await service.createOrUpdate(1, { name: `n${i}` }, ['id']);
        }

        expect(repositoryCacheSize()).toBe(cacheSizeBefore);
    });

    it('always uses the schema object the tenant was registered with', async () => {
        const registered = (dataSource.options.entities as EntitySchema<TestEntity>[]).filter(
            (entity) => entity.options?.name === 'test_entities_1',
        );

        for (let i = 0; i < 10; i++) {
            await service.findBy(1, { name: `n${i}` }, 1, 10);
        }

        expect(registered).toHaveLength(1);
        expect(new Set(repositoryTargets).size).toBe(1);
        expect(repositoryTargets[0]).toBe(registered[0]);
    });

    it('keeps tenants isolated', async () => {
        await service.findBy(1, { name: 'a' }, 1, 10);
        await service.findBy(2, { name: 'a' }, 1, 10);

        const names = repositoryTargets.map((target) => (target as EntitySchema<TestEntity>).options.name);
        expect(names).toEqual(['test_entities_1', 'test_entities_2']);
    });

    it('rejects an unknown tenant without caching anything for it', async () => {
        const cacheSizeBefore = repositoryCacheSize();
        const entityCountBefore = (dataSource.options.entities as unknown[]).length;

        for (let i = 0; i < 100; i++) {
            await expect(service.findBy(999, { name: 'a' }, 1, 10)).rejects.toBeInstanceOf(NotFoundException);
        }

        expect(repositoryCacheSize()).toBe(cacheSizeBefore);
        expect((dataSource.options.entities as unknown[]).length).toBe(entityCountBefore);
        expect(repositoryTargets).toHaveLength(0);
    });

    it('does not register a second schema object when a tenant is registered again', async () => {
        await service.createAndConnectTable(1);

        const schemasForTenant1 = (dataSource.options.entities as EntitySchema<TestEntity>[]).filter(
            (entity) => entity.options?.name === 'test_entities_1',
        );
        expect(schemasForTenant1).toHaveLength(1);
    });

    it('adopts a schema registered by another instance of the same repository service', async () => {
        const otherInstance = new BaseTenantRepositoryService<TestEntity>(dataSource, new TestEntitySchemaFactory());

        await otherInstance.findBy(1, { name: 'a' }, 1, 10);
        await service.findBy(1, { name: 'a' }, 1, 10);

        expect(repositoryTargets[0]).toBe(repositoryTargets[1]);
    });
});
