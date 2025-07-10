import { ConflictException, NotFoundException } from '@nestjs/common';
import { EventBus, QueryBus } from '@nestjs/cqrs';
import { Customer } from '../../../customer/models';
import { RetrieveCustomersQuery } from '../../../customer/queries';
import { SiteCreatedEvent } from '../../events';
import { RetrieveSitesQuery } from '../../queries';
import { SiteEntity } from '../../repositories/entities';
import { SiteRepositoryService } from '../../repositories/services/site-repository.service';
import { CreateSiteCommand } from '../create-site.command';
import { CreateSiteCommandHandler } from './create-site.command-handler';

describe('CreateSiteCommandHandler', () => {
    let queryBus: QueryBus;
    let eventBus: EventBus;
    let siteRepositoryService: SiteRepositoryService;
    let handler: CreateSiteCommandHandler;

    beforeEach(() => {
        queryBus = mockQueryBus();
        eventBus = mockEventBus();
        siteRepositoryService = mockSiteRepositoryService();
        handler = new CreateSiteCommandHandler(queryBus, eventBus, siteRepositoryService);
    });

    describe('execute', () => {
        it('should throw ConflictException if a site with the same key already exists', async () => {
            // Arrange
            const existingSite = { id: 1, key: 'site-key-1', name: 'site-name-1' } as SiteEntity;
            const queryBusExecuteMethod = jest.spyOn(queryBus, 'execute').mockReset().mockResolvedValue([existingSite]);

            // Act & Assert
            await expect(
                handler.execute(
                    new CreateSiteCommand(
                        'transaction-1',
                        'site-key-1',
                        'site-name-1',
                        'customer-key-1',
                        'approver-username-1',
                        'approver-email-1',
                    ),
                ),
            ).rejects.toThrow(ConflictException);
            expect(queryBusExecuteMethod).toHaveBeenCalledTimes(1);
            expect(queryBusExecuteMethod).toHaveBeenCalledWith(
                new RetrieveSitesQuery('transaction-1', 1, 1, 'site-key-1', undefined),
            );
        });

        it('should throw ConflictException if a site with the same name already exists', async () => {
            // Arrange
            const existingSite = { id: 1, key: 'site-key-1', name: 'site-name-1' } as SiteEntity;
            const queryBusExecuteMethod = jest
                .spyOn(queryBus, 'execute')
                .mockReset()
                .mockResolvedValueOnce([]) // First call for key check
                .mockResolvedValueOnce([existingSite]); // Second call for name check

            // Act & Assert
            await expect(
                handler.execute(
                    new CreateSiteCommand(
                        'transaction-1',
                        'site-key-1',
                        'site-name-1',
                        'customer-key-1',
                        'approver-username-1',
                        'approver-email-1',
                    ),
                ),
            ).rejects.toThrow(ConflictException);
            expect(queryBusExecuteMethod).toHaveBeenCalledTimes(2);
            expect(queryBusExecuteMethod).toHaveBeenNthCalledWith(
                1,
                new RetrieveSitesQuery('transaction-1', 1, 1, 'site-key-1', undefined),
            );
            expect(queryBusExecuteMethod).toHaveBeenNthCalledWith(
                2,
                new RetrieveSitesQuery('transaction-1', 1, 1, undefined, 'site-name-1'),
            );
        });

        it('should throw NotFoundException if the customer does not exist', async () => {
            // Arrange
            const queryBusExecuteMethod = jest
                .spyOn(queryBus, 'execute')
                .mockReset()
                .mockResolvedValueOnce([]) // First call for site key check
                .mockResolvedValueOnce([]) // Second call for site name check
                .mockResolvedValueOnce([]); // Third call for customer key check

            // Act & Assert
            await expect(
                handler.execute(
                    new CreateSiteCommand(
                        'transaction-1',
                        'site-key-1',
                        'site-name-1',
                        'customer-key-1',
                        'approver-username-1',
                        'approver-email-1',
                    ),
                ),
            ).rejects.toThrow(NotFoundException);
            expect(queryBusExecuteMethod).toHaveBeenCalledTimes(3);
            expect(queryBusExecuteMethod).toHaveBeenNthCalledWith(
                1,
                new RetrieveSitesQuery('transaction-1', 1, 1, 'site-key-1', undefined),
            );
            expect(queryBusExecuteMethod).toHaveBeenNthCalledWith(
                2,
                new RetrieveSitesQuery('transaction-1', 1, 1, undefined, 'site-name-1'),
            );
            expect(queryBusExecuteMethod).toHaveBeenNthCalledWith(
                3,
                new RetrieveCustomersQuery('transaction-1', 1, 1, 'customer-key-1'),
            );
        });

        it('should call the repository service with correct parameters, publish an event and return the result', async () => {
            // Arrange
            const eventBusPublishMethod = jest.spyOn(eventBus, 'publish');
            const siteEntityToBeCreated = { id: 123 } as SiteEntity;
            const siteEntityCreateWithoutIdMethod = jest
                .spyOn(SiteEntity, 'createWithoutId')
                .mockReturnValue(siteEntityToBeCreated);
            const expectedResult = { id: 321 } as SiteEntity;
            const siteRepositoryServiceCreateMethod = jest
                .spyOn(siteRepositoryService, 'create')
                .mockResolvedValue(expectedResult);

            // Act
            const result = await handler.execute(
                new CreateSiteCommand(
                    'transaction-1',
                    'key-1',
                    'name-1',
                    'customer-key-1',
                    'approver-username-1',
                    'approver-email-1',
                ),
            );

            // Assert
            expect(siteEntityCreateWithoutIdMethod).toHaveBeenCalledWith(
                'key-1',
                'name-1',
                'customer-key-1',
                'approver-username-1',
                'approver-email-1',
            );
            expect(siteRepositoryServiceCreateMethod).toHaveBeenCalledWith(siteEntityToBeCreated);
            expect(eventBusPublishMethod).toHaveBeenCalledWith(
                expect.objectContaining(<SiteCreatedEvent>{
                    transactionId: 'transaction-1',
                    eventType: SiteCreatedEvent.EVENT_TYPE,
                    payload: {
                        site: expectedResult,
                    },
                }),
            );
            expect(result).toBe(expectedResult);
        });

        it('should throw an error if the repository fails', async () => {
            // Arrange
            const siteRepositoryServiceCreateMethod = jest
                .spyOn(siteRepositoryService, 'create')
                .mockRejectedValue(new Error('Error'));

            // Act & Assert
            await expect(
                handler.execute(<CreateSiteCommand>{
                    transactionId: 'transaction-1',
                    name: 'site-1',
                }),
            ).rejects.toThrow();
            expect(siteRepositoryServiceCreateMethod).toHaveBeenCalled();
        });
    });
});

function mockQueryBus() {
    const queryBus = {} as QueryBus;
    queryBus.execute = jest
        .fn()
        .mockResolvedValueOnce([]) // First call for site key check
        .mockResolvedValueOnce([]) // Second call for site name check
        .mockResolvedValueOnce([{} as Customer]); // Third call for customer key check

    return queryBus;
}

function mockEventBus() {
    const eventBus = {} as EventBus;
    eventBus.publish = jest.fn();

    return eventBus;
}

function mockSiteRepositoryService() {
    const siteRepositoryService = {} as SiteRepositoryService;
    siteRepositoryService.create = jest.fn();

    return siteRepositoryService;
}
