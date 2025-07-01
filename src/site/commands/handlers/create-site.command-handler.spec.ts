import { EventBus } from '@nestjs/cqrs';
import { SiteCreatedEvent } from '../../events';
import { SiteEntity } from '../../repositories/entities';
import { SiteRepositoryService } from '../../repositories/services/site-repository.service';
import { CreateSiteCommand } from '../create-site.command';
import { CreateSiteCommandHandler } from './create-site.command-handler';

describe('CreateSiteCommandHandler', () => {
    let eventBus: EventBus;
    let siteRepositoryService: SiteRepositoryService;
    let handler: CreateSiteCommandHandler;

    beforeEach(() => {
        eventBus = mockEventBus();
        siteRepositoryService = mockSiteRepositoryService();
        handler = new CreateSiteCommandHandler(eventBus, siteRepositoryService);
    });

    describe('execute', () => {
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
                    'customer-name-1',
                    'approver-username-1',
                    'approver-email-1',
                ),
            );

            // Assert
            expect(siteEntityCreateWithoutIdMethod).toHaveBeenCalledWith(
                'key-1',
                'name-1',
                'customer-key-1',
                'customer-name-1',
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
