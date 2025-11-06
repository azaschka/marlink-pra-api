import { DataSource, DeleteResult, EntitySchema, InsertResult, Repository } from 'typeorm';
import { BaseTenantEntitySchemaFactory } from '../factories';
import { BaseTenantRepositoryService } from './base-tenant-repository.service';

class MockData {
    public id?: number;
    public name!: string;
}

abstract class TestHelper {
    public static mockRepositoryData(name: string): MockData {
        const entity = new MockData();
        entity.name = name;
        return entity;
    }

    public static mockEntitySchema(): EntitySchema<MockData> {
        return {
            options: {
                name: 'mock-table-name',
            },
        } as EntitySchema<MockData>;
    }
}

describe('BaseTenantRepositoryService', () => {
    let service: BaseTenantRepositoryService<MockData>;
    let dataSource: DataSource;
    let tenantEntitySchemaFactory: BaseTenantEntitySchemaFactory<MockData>;

    beforeEach(() => {
        dataSource = mockDataSource();
        tenantEntitySchemaFactory = mockBaseTenantEntitySchemaFactory();
        service = new BaseTenantRepositoryService<MockData>(dataSource, tenantEntitySchemaFactory);
    });

    describe('createAndConnectTable', () => {
        it('should create the entity schema, register the entity dynamically, build the metadata, synchronize the db and return the table name', async () => {
            const { dataSourceBuildMetadatasMethod, dataSourceSynchronizeMethod } = spyDataSource(dataSource);
            const tenantEntitySchemaFactoryCreateMethod = jest.spyOn(tenantEntitySchemaFactory, 'create');

            const result = await service.createAndConnectTable(123);

            expect(tenantEntitySchemaFactoryCreateMethod).toHaveBeenCalledWith(123);
            expect(dataSource.options.entities).toContainEqual(TestHelper.mockEntitySchema());
            expect(dataSourceBuildMetadatasMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceSynchronizeMethod).toHaveBeenCalledWith(false); // dropBeforeSync = false
            expect(result).toStrictEqual({ tableName: 'mock-table-name' });
        });

        it('should not register the entity dynamically when the entity is already registered', async () => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            dataSource.options.entities = [TestHelper.mockEntitySchema()];
            const { dataSourceBuildMetadatasMethod, dataSourceSynchronizeMethod } = spyDataSource(dataSource);
            const tenantEntitySchemaFactoryCreateMethod = jest.spyOn(tenantEntitySchemaFactory, 'create');

            const result = await service.createAndConnectTable(123);

            expect(tenantEntitySchemaFactoryCreateMethod).toHaveBeenCalledWith(123);
            expect(dataSource.options.entities).toContainEqual(TestHelper.mockEntitySchema());
            expect(dataSourceBuildMetadatasMethod).not.toHaveBeenCalled();
            expect(dataSourceSynchronizeMethod).not.toHaveBeenCalled();
            expect(result).toStrictEqual({ tableName: 'mock-table-name' });
        });

        it('should not build the metadata and synchronize the db when not all relation targets are registered as entities', async () => {
            const incompleteEntitySchema = {
                options: {
                    name: 'incomplete-entity',
                    relations: {
                        relation1: {
                            target: 'non_existing_entity',
                        },
                    },
                },
            } as unknown as EntitySchema<MockData>;
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            dataSource.options.entities = [TestHelper.mockEntitySchema(), incompleteEntitySchema];
            const { dataSourceBuildMetadatasMethod, dataSourceSynchronizeMethod } = spyDataSource(dataSource);
            const tenantEntitySchemaFactoryCreateMethod = jest.spyOn(tenantEntitySchemaFactory, 'create');

            const result = await service.createAndConnectTable(123);

            expect(tenantEntitySchemaFactoryCreateMethod).toHaveBeenCalledWith(123);
            expect(dataSource.options.entities).toContainEqual(TestHelper.mockEntitySchema());
            expect(dataSourceBuildMetadatasMethod).not.toHaveBeenCalled();
            expect(dataSourceSynchronizeMethod).not.toHaveBeenCalled();
            expect(result).toStrictEqual({ tableName: 'mock-table-name' });
        });
    });

    describe('create', () => {
        it('should connect to db, start transaction, create and save the entity, commit the transaction, release the connection and return the value', async () => {
            const expectedEntityId = 123;
            const entity = TestHelper.mockRepositoryData('entity-1');
            const {
                dataSourceQueryRunnerConnectMethod,
                dataSourceQueryRunnerStartTransactionMethod,
                dataSourceRepositoryCreateMethod,
                dataSourceRepositorySaveMethod,
                dataSourceQueryRunnerCommitTransactionMethod,
                dataSourceQueryRunnerRollbackTransactionMethod,
                dataSourceQueryRunnerReleaseMethod,
            } = spyDataSource(dataSource);
            dataSourceRepositoryCreateMethod.mockImplementation(() => {
                return {
                    ...entity,
                    id: expectedEntityId,
                } as unknown as MockData; // Fake the return type
            });

            const result = await service.create(123, entity);

            expect(dataSourceQueryRunnerConnectMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceQueryRunnerStartTransactionMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceRepositoryCreateMethod).toHaveBeenCalledWith(entity);
            expect(dataSourceRepositorySaveMethod).toHaveBeenCalledWith({
                id: expectedEntityId,
                name: entity.name,
            });
            expect(dataSourceQueryRunnerCommitTransactionMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceQueryRunnerRollbackTransactionMethod).not.toHaveBeenCalled();
            expect(dataSourceQueryRunnerReleaseMethod).toHaveBeenCalledTimes(1);
            expect(result).toStrictEqual({
                id: expectedEntityId,
                name: entity.name,
            });
        });

        it('should connect to db, start transaction, rollback the transaction and release the connection when an error occurs on saving or commiting the db operation', async () => {
            const entity = TestHelper.mockRepositoryData('entity-1');
            const error = new Error('Error 123');
            const {
                dataSourceQueryRunnerConnectMethod,
                dataSourceQueryRunnerStartTransactionMethod,
                dataSourceRepositoryCreateMethod,
                dataSourceRepositorySaveMethod,
                dataSourceQueryRunnerCommitTransactionMethod,
                dataSourceQueryRunnerRollbackTransactionMethod,
                dataSourceQueryRunnerReleaseMethod,
            } = spyDataSource(dataSource);
            dataSourceRepositorySaveMethod.mockImplementation(() => {
                throw error;
            });

            await expect(service.create(123, entity)).rejects.toThrow(error);

            expect(dataSourceQueryRunnerConnectMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceQueryRunnerStartTransactionMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceRepositoryCreateMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceRepositorySaveMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceQueryRunnerCommitTransactionMethod).not.toHaveBeenCalled();
            expect(dataSourceQueryRunnerRollbackTransactionMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceQueryRunnerReleaseMethod).toHaveBeenCalledTimes(1);
        });
    });

    describe('createOrUpdate', () => {
        it('should connect to db, start transaction, upsert the entity, commit the transaction, release the connection and return the value', async () => {
            const entity = TestHelper.mockRepositoryData('entity-1');
            const {
                dataSourceQueryRunnerConnectMethod,
                dataSourceQueryRunnerStartTransactionMethod,
                dataSourceRepositoryUpsertMethod,
                dataSourceQueryRunnerCommitTransactionMethod,
                dataSourceQueryRunnerRollbackTransactionMethod,
                dataSourceQueryRunnerReleaseMethod,
            } = spyDataSource(dataSource);

            await service.createOrUpdate(123, entity, ['id']);

            expect(dataSourceQueryRunnerConnectMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceQueryRunnerStartTransactionMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceRepositoryUpsertMethod).toHaveBeenCalledWith(entity, {
                conflictPaths: ['id'],
            });
            expect(dataSourceQueryRunnerCommitTransactionMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceQueryRunnerRollbackTransactionMethod).not.toHaveBeenCalled();
            expect(dataSourceQueryRunnerReleaseMethod).toHaveBeenCalledTimes(1);
        });

        it('should connect to db, start transaction, rollback the transaction and release the connection when an error occurs on upsert or commiting the db operation', async () => {
            const entity = TestHelper.mockRepositoryData('entity-1');
            const error = new Error('Error 123');
            const {
                dataSourceQueryRunnerConnectMethod,
                dataSourceQueryRunnerStartTransactionMethod,
                dataSourceRepositoryUpsertMethod,
                dataSourceQueryRunnerCommitTransactionMethod,
                dataSourceQueryRunnerRollbackTransactionMethod,
                dataSourceQueryRunnerReleaseMethod,
            } = spyDataSource(dataSource);
            dataSourceRepositoryUpsertMethod.mockImplementation(() => {
                throw error;
            });

            await expect(service.createOrUpdate(123, entity, ['id'])).rejects.toThrow(error);

            expect(dataSourceQueryRunnerConnectMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceQueryRunnerStartTransactionMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceRepositoryUpsertMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceQueryRunnerCommitTransactionMethod).not.toHaveBeenCalled();
            expect(dataSourceQueryRunnerRollbackTransactionMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceQueryRunnerReleaseMethod).toHaveBeenCalledTimes(1);
        });
    });

    describe('findOneBy', () => {
        it.each([TestHelper.mockRepositoryData('entity-1'), null])(
            'should connect to db, find the entity and return the value',
            async (dbEntity) => {
                const {
                    dataSourceQueryRunnerConnectMethod,
                    dataSourceRepositoryFindOneMethod,
                    dataSourceQueryRunnerReleaseMethod,
                } = spyDataSource(dataSource);
                dataSourceRepositoryFindOneMethod.mockResolvedValue(dbEntity);

                const result = await service.findOneBy(123, { id: 1 });

                expect(dataSourceQueryRunnerConnectMethod).toHaveBeenCalledTimes(1);
                expect(dataSourceRepositoryFindOneMethod).toHaveBeenCalledWith({
                    where: { id: 1 },
                });
                expect(dataSourceQueryRunnerReleaseMethod).toHaveBeenCalledTimes(1);
                expect(result).toBe(dbEntity);
            },
        );

        it('should throw an error when an error occurs on finding the entity', async () => {
            const error = new Error('Error 123');
            const {
                dataSourceQueryRunnerConnectMethod,
                dataSourceRepositoryFindOneMethod,
                dataSourceQueryRunnerReleaseMethod,
            } = spyDataSource(dataSource);
            dataSourceRepositoryFindOneMethod.mockImplementation(() => {
                throw error;
            });

            await expect(service.findOneBy(123, { id: 1 })).rejects.toThrow(error);

            expect(dataSourceQueryRunnerConnectMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceRepositoryFindOneMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceQueryRunnerReleaseMethod).toHaveBeenCalledTimes(1);
        });
    });

    describe('findBy', () => {
        it.each([
            {
                input: {
                    pageNumber: 1,
                    pageSize: 10,
                },
                expected: {
                    skip: 0,
                    take: 10,
                },
            },
            {
                input: {
                    pageNumber: undefined,
                    pageSize: undefined,
                    order: {
                        id: 'ASC',
                    },
                },
                expected: {
                    skip: undefined,
                    take: undefined,
                    order: {
                        id: 'ASC',
                    },
                },
            },
        ])('should connect to db, find the entities and return the value', async (param) => {
            const dbEntities = [TestHelper.mockRepositoryData('entity-1'), TestHelper.mockRepositoryData('entity-2')];
            const {
                dataSourceQueryRunnerConnectMethod,
                dataSourceRepositoryFindMethod,
                dataSourceQueryRunnerReleaseMethod,
            } = spyDataSource(dataSource);
            dataSourceRepositoryFindMethod.mockResolvedValue(dbEntities);

            const result = await service.findBy(
                123,
                { id: 1 },
                param.input.pageNumber,
                param.input.pageSize,
                param.input.order,
            );

            expect(dataSourceQueryRunnerConnectMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceRepositoryFindMethod).toHaveBeenCalledWith({
                where: { id: 1 },
                skip: param.expected.skip,
                take: param.expected.take,
                order: param.expected.order,
            });
            expect(dataSourceQueryRunnerReleaseMethod).toHaveBeenCalledTimes(1);
            expect(result).toBe(dbEntities);
        });

        it('should throw an error when an error occurs on finding the entity', async () => {
            const error = new Error('Error 123');
            const {
                dataSourceQueryRunnerConnectMethod,
                dataSourceRepositoryFindMethod,
                dataSourceQueryRunnerReleaseMethod,
            } = spyDataSource(dataSource);
            dataSourceRepositoryFindMethod.mockImplementation(() => {
                throw error;
            });

            await expect(service.findBy(123, { id: 1 }, 1, 10)).rejects.toThrow(error);

            expect(dataSourceQueryRunnerConnectMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceRepositoryFindMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceQueryRunnerReleaseMethod).toHaveBeenCalledTimes(1);
        });
    });

    describe('deleteBy', () => {
        it('should connect to db, start transaction, delete the entity, commit the transaction, release the connection and return the value', async () => {
            const {
                dataSourceQueryRunnerConnectMethod,
                dataSourceQueryRunnerStartTransactionMethod,
                dataSourceRepositoryDeleteMethod,
                dataSourceQueryRunnerCommitTransactionMethod,
                dataSourceQueryRunnerRollbackTransactionMethod,
                dataSourceQueryRunnerReleaseMethod,
            } = spyDataSource(dataSource);

            await service.deleteBy(123, { id: 1 });

            expect(dataSourceQueryRunnerConnectMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceQueryRunnerStartTransactionMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceRepositoryDeleteMethod).toHaveBeenCalledWith({ id: 1 });
            expect(dataSourceQueryRunnerCommitTransactionMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceQueryRunnerRollbackTransactionMethod).not.toHaveBeenCalled();
            expect(dataSourceQueryRunnerReleaseMethod).toHaveBeenCalledTimes(1);
        });

        it('should connect to db, start transaction, rollback the transaction and release the connection when an error occurs on deleting or commiting the db operation', async () => {
            const error = new Error('Error 123');
            const {
                dataSourceQueryRunnerConnectMethod,
                dataSourceQueryRunnerStartTransactionMethod,
                dataSourceRepositoryDeleteMethod,
                dataSourceQueryRunnerCommitTransactionMethod,
                dataSourceQueryRunnerRollbackTransactionMethod,
                dataSourceQueryRunnerReleaseMethod,
            } = spyDataSource(dataSource);
            dataSourceRepositoryDeleteMethod.mockImplementation(() => {
                throw error;
            });

            await expect(service.deleteBy(123, { id: 1 })).rejects.toThrow(error);

            expect(dataSourceQueryRunnerConnectMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceQueryRunnerStartTransactionMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceRepositoryDeleteMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceQueryRunnerCommitTransactionMethod).not.toHaveBeenCalled();
            expect(dataSourceQueryRunnerRollbackTransactionMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceQueryRunnerReleaseMethod).toHaveBeenCalledTimes(1);
        });
    });

    describe('countBy', () => {
        it('should connect, count entities and return the value', async () => {
            const {
                dataSourceQueryRunnerConnectMethod,
                dataSourceRepositoryCountMethod,
                dataSourceQueryRunnerReleaseMethod,
            } = spyDataSource(dataSource);
            dataSourceRepositoryCountMethod.mockResolvedValue(5);

            const result = await service.countBy(123, { id: 1 });

            expect(dataSourceQueryRunnerConnectMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceRepositoryCountMethod).toHaveBeenCalledWith({ where: { id: 1 } });
            expect(dataSourceQueryRunnerReleaseMethod).toHaveBeenCalledTimes(1);
            expect(result).toBe(5);
        });
    });
});

function mockDataSource(): DataSource {
    const dataSource = {
        options: {
            entities: [],
        },
    } as unknown as DataSource;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    dataSource.buildMetadatas = jest.fn();
    dataSource.synchronize = jest.fn();
    dataSource.getRepository = jest.fn().mockReturnValue({
        metadata: {},
        create: jest.fn(),
        save: jest.fn(),
        upsert: jest.fn(),
        findOne: jest.fn(),
        find: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
    } as unknown as Repository<MockData>);
    dataSource.createQueryRunner = jest.fn().mockReturnValue({
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
    });
    return dataSource;
}

function spyDataSource(dataSource: DataSource) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const dataSourceBuildMetadatasMethod = jest.spyOn(dataSource, 'buildMetadatas');
    const dataSourceSynchronizeMethod = jest.spyOn(dataSource, 'synchronize');
    const dataSourceQueryRunnerConnectMethod = jest.spyOn(dataSource.createQueryRunner(), 'connect');
    const dataSourceQueryRunnerStartTransactionMethod = jest.spyOn(dataSource.createQueryRunner(), 'startTransaction');
    const dataSourceRepositoryCreateMethod = jest
        .spyOn(dataSource.getRepository(TestHelper.mockEntitySchema()), 'create')
        .mockImplementation(() => {
            return {} as unknown as MockData; // Fake the return type
        });
    const dataSourceRepositoryUpsertMethod = jest
        .spyOn(dataSource.getRepository(TestHelper.mockEntitySchema()), 'upsert')
        .mockResolvedValue({} as InsertResult);
    const dataSourceRepositoryFindOneMethod = jest
        .spyOn(dataSource.getRepository(TestHelper.mockEntitySchema()), 'findOne')
        .mockResolvedValue(null);
    const dataSourceRepositoryFindMethod = jest
        .spyOn(dataSource.getRepository(TestHelper.mockEntitySchema()), 'find')
        .mockResolvedValue([] as unknown as MockData[]);
    const dataSourceRepositoryDeleteMethod = jest
        .spyOn(dataSource.getRepository(TestHelper.mockEntitySchema()), 'delete')
        .mockResolvedValue({} as DeleteResult);
    const dataSourceRepositoryCountMethod = jest
        .spyOn(dataSource.getRepository(TestHelper.mockEntitySchema()), 'count')
        .mockResolvedValue(0);
    const dataSourceRepositorySaveMethod = jest.spyOn(dataSource.getRepository(TestHelper.mockEntitySchema()), 'save');
    const dataSourceQueryRunnerCommitTransactionMethod = jest.spyOn(
        dataSource.createQueryRunner(),
        'commitTransaction',
    );
    const dataSourceQueryRunnerRollbackTransactionMethod = jest.spyOn(
        dataSource.createQueryRunner(),
        'rollbackTransaction',
    );
    const dataSourceQueryRunnerReleaseMethod = jest.spyOn(dataSource.createQueryRunner(), 'release');

    return {
        dataSourceBuildMetadatasMethod,
        dataSourceSynchronizeMethod,
        dataSourceQueryRunnerConnectMethod,
        dataSourceQueryRunnerStartTransactionMethod,
        dataSourceRepositoryCreateMethod,
        dataSourceRepositoryUpsertMethod,
        dataSourceRepositoryFindOneMethod,
        dataSourceRepositoryFindMethod,
        dataSourceRepositoryDeleteMethod,
        dataSourceRepositoryCountMethod,
        dataSourceRepositorySaveMethod,
        dataSourceQueryRunnerCommitTransactionMethod,
        dataSourceQueryRunnerRollbackTransactionMethod,
        dataSourceQueryRunnerReleaseMethod,
    };
}

function mockBaseTenantEntitySchemaFactory(): BaseTenantEntitySchemaFactory<MockData> {
    const factory = {} as BaseTenantEntitySchemaFactory<MockData>;
    factory.create = jest.fn().mockReturnValue(TestHelper.mockEntitySchema());

    return factory;
}
