import { NotFoundException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { SiteModifiedEvent } from '../../events';
import { SiteEntity } from '../../repositories/entities';
import { SiteRepositoryService } from '../../repositories/services/site-repository.service';
import { ModifySiteCommand } from '../modify-site.command';
import { ModifySiteCommandHandler } from './modify-site.command-handler';

describe('ModifySiteCommandHandler', () => {
    let eventBus: EventBus;
    let siteRepositoryService: SiteRepositoryService;
    let handler: ModifySiteCommandHandler;

    beforeEach(() => {
        eventBus = mockEventBus();
        siteRepositoryService = mockSiteRepositoryService();
        handler = new ModifySiteCommandHandler(eventBus, siteRepositoryService);
    });

    describe('execute', () => {
        it('should throw NotFoundException if instance not found', async () => {
            // Arrange
            const siteRepositoryServiceFindOneByIdMethod = jest.spyOn(siteRepositoryService, 'findOneById');

            // Act & Assert
            await expect(
                handler.execute(
                    new ModifySiteCommand('transaction-1', 123, [
                        {
                            username: 'approver-username-1',
                            email: 'approver-email-1',
                        },
                    ]),
                ),
            ).rejects.toThrow(NotFoundException);
            expect(siteRepositoryServiceFindOneByIdMethod).toHaveBeenCalledWith(123);
        });

        it('should throw an error if the repository fails', async () => {
            // Arrange
            const siteRepositoryServiceFindOneByIdMethod = jest
                .spyOn(siteRepositoryService, 'findOneById')
                .mockResolvedValue({ id: 123 } as SiteEntity);
            const expectedError = new Error('Error');
            const siteRepositoryServiceCreateOrUpdateByIdMethod = jest
                .spyOn(siteRepositoryService, 'createOrUpdateById')
                .mockRejectedValue(expectedError);

            // Act & Assert
            await expect(
                handler.execute(<ModifySiteCommand>{
                    transactionId: 'transaction-1',
                    id: 123,
                    approvers: [
                        {
                            username: 'approver-username-1',
                            email: 'approver-email-1',
                        },
                    ],
                }),
            ).rejects.toThrow(expectedError);
            expect(siteRepositoryServiceFindOneByIdMethod).toHaveBeenCalledWith(123);
            expect(siteRepositoryServiceCreateOrUpdateByIdMethod).toHaveBeenCalled();
        });

        it('should call the repository service with correct parameters, publish an event and return the result', async () => {
            // Arrange
            const siteRepositoryServiceFindOneByIdMethod = jest
                .spyOn(siteRepositoryService, 'findOneById')
                .mockResolvedValue({
                    id: 123,
                    key: 'site-1',
                    name: 'site-name-1',
                    customerKey: 'customer-key-1',
                    approvers: [
                        {
                            username: 'approver-username-1',
                            email: 'approver-email-1',
                        },
                    ],
                } as SiteEntity);
            const eventBusPublishMethod = jest.spyOn(eventBus, 'publish');
            const siteEntityToBeCreated = { id: 123 } as SiteEntity;
            const siteEntityCreateMethod = jest.spyOn(SiteEntity, 'create').mockReturnValue(siteEntityToBeCreated);
            const siteRepositoryServiceCreateOrUpdateByIdMethod = jest.spyOn(
                siteRepositoryService,
                'createOrUpdateById',
            );

            // Act
            const result = await handler.execute(
                new ModifySiteCommand('transaction-1', 123, [
                    {
                        username: 'approver-username-2',
                        email: 'approver-email-2',
                    },
                ]),
            );

            // Assert
            expect(siteRepositoryServiceFindOneByIdMethod).toHaveBeenCalledWith(123);
            expect(siteEntityCreateMethod).toHaveBeenCalledWith(123, 'site-1', 'site-name-1', 'customer-key-1', [
                {
                    username: 'approver-username-2',
                    email: 'approver-email-2',
                },
            ]);
            expect(siteRepositoryServiceCreateOrUpdateByIdMethod).toHaveBeenCalledWith(siteEntityToBeCreated);
            expect(eventBusPublishMethod).toHaveBeenCalledWith(
                expect.objectContaining(<SiteModifiedEvent>{
                    transactionId: 'transaction-1',
                    eventType: SiteModifiedEvent.EVENT_TYPE,
                    payload: {
                        site: siteEntityToBeCreated,
                    },
                }),
            );
            expect(result).toBe(siteEntityToBeCreated);
        });
    });
});

function mockEventBus() {
    const eventBus = {} as EventBus;
    eventBus.publish = jest.fn();

    return eventBus;
}

function mockSiteRepositoryService() {
    const siteRepositoryService = {} as SiteRepositoryService;
    siteRepositoryService.createOrUpdateById = jest.fn();
    siteRepositoryService.findOneById = jest.fn().mockResolvedValue(null);

    return siteRepositoryService;
}
