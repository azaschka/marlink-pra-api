import { NotFoundException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { CustomerReactivatedEvent } from '../../events';
import { Customer } from '../../models';
import { CustomerRepositoryService } from '../../repositories/services/customer-repository.service';
import { ReactivateCustomerCommand } from '../reactivate-customer.command';
import { ReactivateCustomerCommandHandler } from './reactivate-customer.command-handler';

describe('ReactivateCustomerCommandHandler', () => {
    let eventBus: EventBus;
    let customerRepositoryService: CustomerRepositoryService;
    let handler: ReactivateCustomerCommandHandler;

    beforeEach(() => {
        eventBus = mockEventBus();
        customerRepositoryService = mockCustomerRepositoryService();
        handler = new ReactivateCustomerCommandHandler(eventBus, customerRepositoryService);
    });

    it('should throw NotFoundException if instance not found', async () => {
        await expect(handler.execute(new ReactivateCustomerCommand('transaction-1', 123))).rejects.toThrow(
            NotFoundException,
        );
    });

    it('should reactivate customer and publish an event', async () => {
        const eventBusPublishMethod = jest.spyOn(eventBus, 'publish');
        const customerRepositoryServiceCreateOrUpdateByIdMethod = jest.spyOn(
            customerRepositoryService,
            'createOrUpdateById',
        );
        const customerRepositoryServiceFindOneByIdMethod = jest
            .spyOn(customerRepositoryService, 'findOneById')
            .mockResolvedValue({ id: 123, isDeactivated: true } as Customer);

        await handler.execute(new ReactivateCustomerCommand('transaction-1', 123));

        expect(customerRepositoryServiceFindOneByIdMethod).toHaveBeenCalledWith(123);
        expect(customerRepositoryServiceCreateOrUpdateByIdMethod).toHaveBeenCalledWith({
            id: 123,
            isDeactivated: false,
        });
        expect(eventBusPublishMethod).toHaveBeenCalledWith(
            expect.objectContaining(<CustomerReactivatedEvent>{
                transactionId: 'transaction-1',
                eventType: CustomerReactivatedEvent.EVENT_TYPE,
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

function mockCustomerRepositoryService(): CustomerRepositoryService {
    const service = {} as CustomerRepositoryService;
    service.findOneById = jest.fn();
    service.createOrUpdateById = jest.fn();

    return service;
}
