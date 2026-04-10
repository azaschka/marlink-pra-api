import { NotFoundException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { BusinessUnit } from '../../../beyondtrust-instance/enums';
import { CustomerModifiedEvent } from '../../events';
import { CustomerEntity } from '../../repositories/entities';
import { CustomerRepositoryService } from '../../repositories/services/customer-repository.service';
import { ModifyCustomerCommand } from '../modify-customer.command';
import { ModifyCustomerCommandHandler } from './modify-customer.command-handler';

describe('ModifyCustomerCommandHandler', () => {
    let eventBus: EventBus;
    let customerRepositoryService: CustomerRepositoryService;
    let handler: ModifyCustomerCommandHandler;

    beforeEach(() => {
        eventBus = mockEventBus();
        customerRepositoryService = mockCustomerRepositoryService();
        handler = new ModifyCustomerCommandHandler(eventBus, customerRepositoryService);
    });

    describe('execute', () => {
        it('should throw NotFoundException if instance not found', async () => {
            // Arrange
            const customerRepositoryServiceFindOneByIdMethod = jest.spyOn(customerRepositoryService, 'findOneById');

            // Act & Assert
            await expect(handler.execute(new ModifyCustomerCommand('transaction-1', 123, 1))).rejects.toThrow(
                NotFoundException,
            );
            expect(customerRepositoryServiceFindOneByIdMethod).toHaveBeenCalledWith(123);
        });

        it('should throw an error if the repository fails', async () => {
            // Arrange
            const customerRepositoryServiceFindOneByIdMethod = jest
                .spyOn(customerRepositoryService, 'findOneById')
                .mockResolvedValue({ id: 123 } as CustomerEntity);
            const expectedError = new Error('Error');
            const customerRepositoryServiceCreateOrUpdateByIdMethod = jest
                .spyOn(customerRepositoryService, 'createOrUpdateById')
                .mockRejectedValue(expectedError);

            // Act & Assert
            await expect(
                handler.execute(<ModifyCustomerCommand>{
                    transactionId: 'transaction-1',
                    id: 123,
                    beyondtrustInstanceId: 1,
                }),
            ).rejects.toThrow(expectedError);
            expect(customerRepositoryServiceFindOneByIdMethod).toHaveBeenCalledWith(123);
            expect(customerRepositoryServiceCreateOrUpdateByIdMethod).toHaveBeenCalled();
        });

        it('should call the repository service with correct parameters, publish an event and return the result', async () => {
            // Arrange
            const customerRepositoryServiceFindOneByIdMethod = jest
                .spyOn(customerRepositoryService, 'findOneById')
                .mockResolvedValue({
                    id: 123,
                    key: 'customer-key-1',
                    name: 'customer-name-1',
                    businessUnit: BusinessUnit.EG,
                    beyondtrustInstanceId: 1,
                    isDeactivated: false,
                    creationDate: new Date('2025-01-01'),
                    lastModificationDate: new Date('2025-01-01'),
                } as unknown as CustomerEntity);
            const eventBusPublishMethod = jest.spyOn(eventBus, 'publish');
            const customerEntityToBeCreated = { id: 123 } as CustomerEntity;
            const customerEntityCreateMethod = jest
                .spyOn(CustomerEntity, 'create')
                .mockReturnValue(customerEntityToBeCreated);
            const customerRepositoryServiceCreateOrUpdateByIdMethod = jest.spyOn(
                customerRepositoryService,
                'createOrUpdateById',
            );

            // Act
            const result = await handler.execute(new ModifyCustomerCommand('transaction-1', 123, 1));

            // Assert
            expect(customerRepositoryServiceFindOneByIdMethod).toHaveBeenCalledWith(123);
            expect(customerEntityCreateMethod).toHaveBeenCalledWith(
                123,
                'customer-key-1',
                'customer-name-1',
                false,
                BusinessUnit.EG,
                1,
            );
            expect(customerRepositoryServiceCreateOrUpdateByIdMethod).toHaveBeenCalledWith(customerEntityToBeCreated);
            expect(eventBusPublishMethod).toHaveBeenCalledWith(
                expect.objectContaining(<CustomerModifiedEvent>{
                    transactionId: 'transaction-1',
                    eventType: CustomerModifiedEvent.EVENT_TYPE,
                    payload: {
                        customer: customerEntityToBeCreated,
                    },
                }),
            );
            expect(result).toBe(customerEntityToBeCreated);
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
    customerRepositoryService.createOrUpdateById = jest.fn();
    customerRepositoryService.findOneById = jest.fn().mockResolvedValue(null);

    return customerRepositoryService;
}
