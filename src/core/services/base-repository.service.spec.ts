import { DataSource, DeleteResult, InsertResult } from 'typeorm';
import { BaseRepositoryService } from './base-repository.service';

class MockEntity {
    public id?: number;
    public name!: string;
}

abstract class TestHelper {
    public static mockRepositoryEntity(name: string): MockEntity {
        const entity = new MockEntity();
        entity.name = name;
        return entity;
    }
}

describe('BaseRepositoryService', () => {
    let service: BaseRepositoryService<MockEntity>;
    let dataSource: DataSource;

    beforeEach(() => {
        dataSource = mockDataSource();
        service = new BaseRepositoryService<MockEntity>(dataSource, MockEntity);
    });

    describe('create', () => {
        it('should connect to db, start transaction, create and save the entity, commit the transaction, release the connection and return the value', async () => {
            const expectedEntityId = 123;
            const entity = TestHelper.mockRepositoryEntity('entity-1');
            const {
                dataSourceQueryRunnerConnectMethod,
                dataSourceQueryRunnerStartTransactionMethod,
                dataSourceQueryRunnerManagerCreateMethod,
                dataSourceQueryRunnerManagerSaveMethod,
                dataSourceQueryRunnerCommitTransactionMethod,
                dataSourceQueryRunnerRollbackTransactionMethod,
                dataSourceQueryRunnerReleaseMethod,
            } = spyDataSource(dataSource);
            dataSourceQueryRunnerManagerCreateMethod.mockImplementation(() => {
                return {
                    ...entity,
                    id: expectedEntityId,
                } as unknown as [MockEntity]; // Fake the return type
            });

            const result = await service.create(entity);

            expect(dataSourceQueryRunnerConnectMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceQueryRunnerStartTransactionMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceQueryRunnerManagerCreateMethod).toHaveBeenCalledWith(MockEntity, entity);
            expect(dataSourceQueryRunnerManagerSaveMethod).toHaveBeenCalledWith({
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
            const entity = TestHelper.mockRepositoryEntity('entity-1');
            const error = new Error('Error 123');
            const {
                dataSourceQueryRunnerConnectMethod,
                dataSourceQueryRunnerStartTransactionMethod,
                dataSourceQueryRunnerManagerCreateMethod,
                dataSourceQueryRunnerManagerSaveMethod,
                dataSourceQueryRunnerCommitTransactionMethod,
                dataSourceQueryRunnerRollbackTransactionMethod,
                dataSourceQueryRunnerReleaseMethod,
            } = spyDataSource(dataSource);
            dataSourceQueryRunnerManagerSaveMethod.mockImplementation(() => {
                throw error;
            });

            await expect(service.create(entity)).rejects.toThrow(error);

            expect(dataSourceQueryRunnerConnectMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceQueryRunnerStartTransactionMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceQueryRunnerManagerCreateMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceQueryRunnerManagerSaveMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceQueryRunnerCommitTransactionMethod).not.toHaveBeenCalled();
            expect(dataSourceQueryRunnerRollbackTransactionMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceQueryRunnerReleaseMethod).toHaveBeenCalledTimes(1);
        });
    });

    describe('createOrUpdate', () => {
        it('should connect to db, start transaction, upsert the entity, commit the transaction, release the connection and return the value', async () => {
            const entity = TestHelper.mockRepositoryEntity('entity-1');
            const {
                dataSourceQueryRunnerConnectMethod,
                dataSourceQueryRunnerStartTransactionMethod,
                dataSourceQueryRunnerManagerUpsertMethod,
                dataSourceQueryRunnerCommitTransactionMethod,
                dataSourceQueryRunnerRollbackTransactionMethod,
                dataSourceQueryRunnerReleaseMethod,
            } = spyDataSource(dataSource);

            await service.createOrUpdate(entity, ['id']);

            expect(dataSourceQueryRunnerConnectMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceQueryRunnerStartTransactionMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceQueryRunnerManagerUpsertMethod).toHaveBeenCalledWith(MockEntity, entity, {
                conflictPaths: ['id'],
            });
            expect(dataSourceQueryRunnerCommitTransactionMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceQueryRunnerRollbackTransactionMethod).not.toHaveBeenCalled();
            expect(dataSourceQueryRunnerReleaseMethod).toHaveBeenCalledTimes(1);
        });

        it('should connect to db, start transaction, rollback the transaction and release the connection when an error occurs on upsert or commiting the db operation', async () => {
            const entity = TestHelper.mockRepositoryEntity('entity-1');
            const error = new Error('Error 123');
            const {
                dataSourceQueryRunnerConnectMethod,
                dataSourceQueryRunnerStartTransactionMethod,
                dataSourceQueryRunnerManagerUpsertMethod,
                dataSourceQueryRunnerCommitTransactionMethod,
                dataSourceQueryRunnerRollbackTransactionMethod,
                dataSourceQueryRunnerReleaseMethod,
            } = spyDataSource(dataSource);
            dataSourceQueryRunnerManagerUpsertMethod.mockImplementation(() => {
                throw error;
            });

            await expect(service.createOrUpdate(entity, ['id'])).rejects.toThrow(error);

            expect(dataSourceQueryRunnerConnectMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceQueryRunnerStartTransactionMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceQueryRunnerManagerUpsertMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceQueryRunnerCommitTransactionMethod).not.toHaveBeenCalled();
            expect(dataSourceQueryRunnerRollbackTransactionMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceQueryRunnerReleaseMethod).toHaveBeenCalledTimes(1);
        });
    });

    describe('findOneBy', () => {
        it.each([TestHelper.mockRepositoryEntity('entity-1'), null])(
            'should connect to db, find the entity and return the value',
            async (dbEntity) => {
                const {
                    dataSourceQueryRunnerConnectMethod,
                    dataSourceQueryRunnerManagerFindOneMethod,
                    dataSourceQueryRunnerReleaseMethod,
                } = spyDataSource(dataSource);
                dataSourceQueryRunnerManagerFindOneMethod.mockResolvedValue(dbEntity);

                const result = await service.findOneBy({ id: 1 });

                expect(dataSourceQueryRunnerConnectMethod).toHaveBeenCalledTimes(1);
                expect(dataSourceQueryRunnerManagerFindOneMethod).toHaveBeenCalledWith(MockEntity, {
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
                dataSourceQueryRunnerManagerFindOneMethod,
                dataSourceQueryRunnerReleaseMethod,
            } = spyDataSource(dataSource);
            dataSourceQueryRunnerManagerFindOneMethod.mockImplementation(() => {
                throw error;
            });

            await expect(service.findOneBy({ id: 1 })).rejects.toThrow(error);

            expect(dataSourceQueryRunnerConnectMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceQueryRunnerManagerFindOneMethod).toHaveBeenCalledTimes(1);
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
            const dbEntities = [
                TestHelper.mockRepositoryEntity('entity-1'),
                TestHelper.mockRepositoryEntity('entity-2'),
            ];
            const {
                dataSourceQueryRunnerConnectMethod,
                dataSourceQueryRunnerManagerFindMethod,
                dataSourceQueryRunnerReleaseMethod,
            } = spyDataSource(dataSource);
            dataSourceQueryRunnerManagerFindMethod.mockResolvedValue(dbEntities);

            const result = await service.findBy(
                { id: 1 },
                param.input.pageNumber,
                param.input.pageSize,
                param.input.order,
            );

            expect(dataSourceQueryRunnerConnectMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceQueryRunnerManagerFindMethod).toHaveBeenCalledWith(MockEntity, {
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
                dataSourceQueryRunnerManagerFindMethod,
                dataSourceQueryRunnerReleaseMethod,
            } = spyDataSource(dataSource);
            dataSourceQueryRunnerManagerFindMethod.mockImplementation(() => {
                throw error;
            });

            await expect(service.findBy({ id: 1 }, 1, 10)).rejects.toThrow(error);

            expect(dataSourceQueryRunnerConnectMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceQueryRunnerManagerFindMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceQueryRunnerReleaseMethod).toHaveBeenCalledTimes(1);
        });
    });

    describe('deleteBy', () => {
        it('should connect to db, start transaction, delete the entity, commit the transaction, release the connection and return the value', async () => {
            const {
                dataSourceQueryRunnerConnectMethod,
                dataSourceQueryRunnerStartTransactionMethod,
                dataSourceQueryRunnerManagerDeleteMethod,
                dataSourceQueryRunnerCommitTransactionMethod,
                dataSourceQueryRunnerRollbackTransactionMethod,
                dataSourceQueryRunnerReleaseMethod,
            } = spyDataSource(dataSource);

            await service.deleteBy({ id: 1 });

            expect(dataSourceQueryRunnerConnectMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceQueryRunnerStartTransactionMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceQueryRunnerManagerDeleteMethod).toHaveBeenCalledWith(MockEntity, { id: 1 });
            expect(dataSourceQueryRunnerCommitTransactionMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceQueryRunnerRollbackTransactionMethod).not.toHaveBeenCalled();
            expect(dataSourceQueryRunnerReleaseMethod).toHaveBeenCalledTimes(1);
        });

        it('should connect to db, start transaction, rollback the transaction and release the connection when an error occurs on deleting or commiting the db operation', async () => {
            const error = new Error('Error 123');
            const {
                dataSourceQueryRunnerConnectMethod,
                dataSourceQueryRunnerStartTransactionMethod,
                dataSourceQueryRunnerManagerDeleteMethod,
                dataSourceQueryRunnerCommitTransactionMethod,
                dataSourceQueryRunnerRollbackTransactionMethod,
                dataSourceQueryRunnerReleaseMethod,
            } = spyDataSource(dataSource);
            dataSourceQueryRunnerManagerDeleteMethod.mockImplementation(() => {
                throw error;
            });

            await expect(service.deleteBy({ id: 1 })).rejects.toThrow(error);

            expect(dataSourceQueryRunnerConnectMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceQueryRunnerStartTransactionMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceQueryRunnerManagerDeleteMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceQueryRunnerCommitTransactionMethod).not.toHaveBeenCalled();
            expect(dataSourceQueryRunnerRollbackTransactionMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceQueryRunnerReleaseMethod).toHaveBeenCalledTimes(1);
        });
    });

    describe('countBy', () => {
        it('should connect, count entities and return the value', async () => {
            const {
                dataSourceQueryRunnerConnectMethod,
                dataSourceQueryRunnerManagerCountMethod,
                dataSourceQueryRunnerReleaseMethod,
            } = spyDataSource(dataSource);
            dataSourceQueryRunnerManagerCountMethod.mockResolvedValue(5);

            const result = await service.countBy({ id: 1 });

            expect(dataSourceQueryRunnerConnectMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceQueryRunnerManagerCountMethod).toHaveBeenCalledWith(MockEntity, { where: { id: 1 } });
            expect(dataSourceQueryRunnerReleaseMethod).toHaveBeenCalledTimes(1);
            expect(result).toBe(5);
        });
    });

    describe('dead pooled connections', () => {
        it('should repeat a read once with a fresh connection when the pooled connection was dead and release both', async () => {
            const {
                dataSourceQueryRunnerConnectMethod,
                dataSourceQueryRunnerManagerFindMethod,
                dataSourceQueryRunnerReleaseMethod,
            } = spyDataSource(dataSource);
            dataSourceQueryRunnerManagerFindMethod
                .mockRejectedValueOnce(
                    Object.assign(new Error('Connection lost'), { code: 'PROTOCOL_CONNECTION_LOST' }),
                )
                .mockResolvedValueOnce([TestHelper.mockRepositoryEntity('entity-1')]);

            const result = await service.findBy({ name: 'entity-1' }, 1, 10);

            expect(result).toHaveLength(1);
            expect(dataSourceQueryRunnerManagerFindMethod).toHaveBeenCalledTimes(2);
            expect(dataSourceQueryRunnerConnectMethod).toHaveBeenCalledTimes(2);
            expect(dataSourceQueryRunnerReleaseMethod).toHaveBeenCalledTimes(2);
        });

        it('should not repeat a write automatically when the pooled connection was dead', async () => {
            const {
                dataSourceQueryRunnerManagerDeleteMethod,
                dataSourceQueryRunnerRollbackTransactionMethod,
                dataSourceQueryRunnerReleaseMethod,
            } = spyDataSource(dataSource);
            dataSourceQueryRunnerManagerDeleteMethod.mockRejectedValue(
                Object.assign(new Error('Connection lost'), { code: 'PROTOCOL_CONNECTION_LOST' }),
            );

            await expect(service.deleteBy({ name: 'entity-1' })).rejects.toThrow('Connection lost');

            expect(dataSourceQueryRunnerManagerDeleteMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceQueryRunnerRollbackTransactionMethod).toHaveBeenCalledTimes(1);
            expect(dataSourceQueryRunnerReleaseMethod).toHaveBeenCalledTimes(1);
        });
    });
});

function mockDataSource(): DataSource {
    const dataSource = {} as DataSource;
    dataSource.createQueryRunner = jest.fn().mockReturnValue({
        connect: jest.fn(),
        startTransaction: jest.fn(),
        manager: {
            create: jest.fn(),
            save: jest.fn(),
            upsert: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
        },
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
    });
    return dataSource;
}

function spyDataSource(dataSource: DataSource) {
    const dataSourceQueryRunnerConnectMethod = jest.spyOn(dataSource.createQueryRunner(), 'connect');
    const dataSourceQueryRunnerStartTransactionMethod = jest.spyOn(dataSource.createQueryRunner(), 'startTransaction');
    const dataSourceQueryRunnerManagerCreateMethod = jest
        .spyOn(dataSource.createQueryRunner().manager, 'create')
        .mockImplementation(() => {
            return {} as unknown as [MockEntity]; // Fake the return type
        });
    const dataSourceQueryRunnerManagerUpsertMethod = jest
        .spyOn(dataSource.createQueryRunner().manager, 'upsert')
        .mockResolvedValue({} as InsertResult);
    const dataSourceQueryRunnerManagerFindOneMethod = jest
        .spyOn(dataSource.createQueryRunner().manager, 'findOne')
        .mockResolvedValue(null);
    const dataSourceQueryRunnerManagerFindMethod = jest
        .spyOn(dataSource.createQueryRunner().manager, 'find')
        .mockResolvedValue([] as unknown as MockEntity[]);
    const dataSourceQueryRunnerManagerDeleteMethod = jest
        .spyOn(dataSource.createQueryRunner().manager, 'delete')
        .mockResolvedValue({} as DeleteResult);
    const dataSourceQueryRunnerManagerCountMethod = jest
        .spyOn(dataSource.createQueryRunner().manager, 'count')
        .mockResolvedValue(0);
    const dataSourceQueryRunnerManagerSaveMethod = jest.spyOn(dataSource.createQueryRunner().manager, 'save');
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
        dataSourceQueryRunnerConnectMethod,
        dataSourceQueryRunnerStartTransactionMethod,
        dataSourceQueryRunnerManagerCreateMethod,
        dataSourceQueryRunnerManagerUpsertMethod,
        dataSourceQueryRunnerManagerFindOneMethod,
        dataSourceQueryRunnerManagerFindMethod,
        dataSourceQueryRunnerManagerDeleteMethod,
        dataSourceQueryRunnerManagerCountMethod,
        dataSourceQueryRunnerManagerSaveMethod,
        dataSourceQueryRunnerCommitTransactionMethod,
        dataSourceQueryRunnerRollbackTransactionMethod,
        dataSourceQueryRunnerReleaseMethod,
    };
}
