import { NotFoundException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { CustomerDeactivatedEvent } from '../../events';
import { Customer } from '../../models';
import { CustomerRepositoryService } from '../../repositories/services/customer-repository.service';
import { DeactivateCustomerCommand } from '../deactivate-customer.command';
import { DeactivateCustomerCommandHandler } from './deactivate-customer.command-handler';

describe('DeactivateCustomerCommandHandler', () => {
    let eventBus: EventBus;
    let customerRepositoryService: CustomerRepositoryService;
    let handler: DeactivateCustomerCommandHandler;

    beforeEach(() => {
        eventBus = mockEventBus();
        customerRepositoryService = mockCustomerRepositoryService();
        handler = new DeactivateCustomerCommandHandler(eventBus, customerRepositoryService);
    });

    it('should throw NotFoundException if instance not found', async () => {
        await expect(handler.execute(new DeactivateCustomerCommand('transaction-1', 123))).rejects.toThrow(
            NotFoundException,
        );
    });

    it('should deactivate customer and publish an event', async () => {
        const eventBusPublishMethod = jest.spyOn(eventBus, 'publish');
        const customerRepositoryServiceCreateOrUpdateByIdMethod = jest.spyOn(
            customerRepositoryService,
            'createOrUpdateById',
        );
        const customerRepositoryServiceFindOneByIdMethod = jest
            .spyOn(customerRepositoryService, 'findOneById')
            .mockResolvedValue({ id: 123, isDeactivated: false } as Customer);

        await handler.execute(new DeactivateCustomerCommand('transaction-1', 123));

        expect(customerRepositoryServiceFindOneByIdMethod).toHaveBeenCalledWith(123);
        expect(customerRepositoryServiceCreateOrUpdateByIdMethod).toHaveBeenCalledWith({
            id: 123,
            isDeactivated: true,
        });
        expect(eventBusPublishMethod).toHaveBeenCalledWith(
            expect.objectContaining(<CustomerDeactivatedEvent>{
                transactionId: 'transaction-1',
                eventType: CustomerDeactivatedEvent.EVENT_TYPE,
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
