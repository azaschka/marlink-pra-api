import { EventBus } from '@nestjs/cqrs';
import { BillingType } from '../../enums';
import { CustomerCreatedEvent } from '../../events';
import { CustomerEntity } from '../../repositories/entities';
import { CustomerRepositoryService } from '../../repositories/services/customer-repository.service';
import { CreateCustomerCommand } from '../create-customer.command';
import { CreateCustomerCommandHandler } from './create-customer.command-handler';

describe('CreateCustomerCommandHandler', () => {
    let eventBus: EventBus;
    let customerRepositoryService: CustomerRepositoryService;
    let handler: CreateCustomerCommandHandler;

    beforeEach(() => {
        eventBus = mockEventBus();
        customerRepositoryService = mockCustomerRepositoryService();
        handler = new CreateCustomerCommandHandler(eventBus, customerRepositoryService);
    });

    describe('execute', () => {
        it('should call the repository service with correct parameters, publish an event and return the result', async () => {
            // Arrange
            const eventBusPublishMethod = jest.spyOn(eventBus, 'publish');
            const customerEntityToBeCreated = { id: 123 } as CustomerEntity;
            const customerEntityCreateWithoutIdMethod = jest
                .spyOn(CustomerEntity, 'createWithoutId')
                .mockReturnValue(customerEntityToBeCreated);
            const expectedResult = { id: 321 } as CustomerEntity;
            const customerRepositoryServiceCreateMethod = jest
                .spyOn(customerRepositoryService, 'create')
                .mockResolvedValue(expectedResult);

            // Act
            const result = await handler.execute(
                new CreateCustomerCommand('transaction-1', 'customer-key-1', 'customer-name-1', BillingType.User),
            );

            // Assert
            expect(customerEntityCreateWithoutIdMethod).toHaveBeenCalledWith(
                'customer-key-1',
                'customer-name-1',
                false,
                BillingType.User,
                123, // TODO fix
            );
            expect(customerRepositoryServiceCreateMethod).toHaveBeenCalledWith(customerEntityToBeCreated);
            expect(eventBusPublishMethod).toHaveBeenCalledWith(
                expect.objectContaining(<CustomerCreatedEvent>{
                    transactionId: 'transaction-1',
                    eventType: CustomerCreatedEvent.EVENT_TYPE,
                    payload: {
                        customer: expectedResult,
                    },
                }),
            );
            expect(result).toBe(expectedResult);
        });

        it('should throw an error if the repository fails', async () => {
            // Arrange
            const customerRepositoryServiceCreateMethod = jest
                .spyOn(customerRepositoryService, 'create')
                .mockRejectedValue(new Error('Error'));

            // Act & Assert
            await expect(
                handler.execute(<CreateCustomerCommand>{
                    transactionId: 'transaction-1',
                    name: 'customer-1',
                }),
            ).rejects.toThrow();
            expect(customerRepositoryServiceCreateMethod).toHaveBeenCalled();
        });
    });
});

function mockEventBus() {
    const eventBus = {} as EventBus;
    eventBus.publish = jest.fn();

    return eventBus;
}

function mockCustomerRepositoryService() {
    const customerRepositoryService = {} as CustomerRepositoryService;
    customerRepositoryService.create = jest.fn();

    return customerRepositoryService;
}
