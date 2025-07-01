import { NotFoundException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { SiteDeletedEvent } from '../../events';
import { Site } from '../../models';
import { SiteRepositoryService } from '../../repositories/services/site-repository.service';
import { DeleteSiteCommand } from '../delete-site.command';
import { DeleteSiteCommandHandler } from './delete-site.command-handler';

describe('DeleteSiteCommandHandler', () => {
    let eventBus: EventBus;
    let siteRepositoryService: SiteRepositoryService;
    let handler: DeleteSiteCommandHandler;

    beforeEach(() => {
        eventBus = mockEventBus();
        siteRepositoryService = mockSiteRepositoryService();
        handler = new DeleteSiteCommandHandler(eventBus, siteRepositoryService);
    });

    it('should throw NotFoundException if instance not found', async () => {
        await expect(handler.execute(new DeleteSiteCommand('transaction-1', 123))).rejects.toThrow(NotFoundException);
    });

    it('should delete data from db and publish an event', async () => {
        const eventBusPublishMethod = jest.spyOn(eventBus, 'publish');
        const siteRepositoryServiceDeleteByIdMethod = jest.spyOn(siteRepositoryService, 'deleteById');
        const siteRepositoryServiceFindOneByIdMethod = jest
            .spyOn(siteRepositoryService, 'findOneById')
            .mockResolvedValue({ id: 123 } as Site);

        await handler.execute(new DeleteSiteCommand('transaction-1', 123));

        expect(siteRepositoryServiceFindOneByIdMethod).toHaveBeenCalledWith(123);
        expect(siteRepositoryServiceDeleteByIdMethod).toHaveBeenCalledWith(123);
        expect(eventBusPublishMethod).toHaveBeenCalledWith(
            expect.objectContaining(<SiteDeletedEvent>{
                transactionId: 'transaction-1',
                eventType: SiteDeletedEvent.EVENT_TYPE,
                payload: {
                    id: 123,
                },
            }),
        );
    });
});

function mockEventBus() {
    const service = {} as EventBus;
    service.publish = jest.fn().mockResolvedValue(Promise.resolve());

    return service;
}

function mockSiteRepositoryService(): SiteRepositoryService {
    const service = {} as SiteRepositoryService;
    service.deleteById = jest.fn().mockReturnValue(Promise.resolve());
    service.findOneById = jest.fn().mockResolvedValue(null);

    return service;
}
