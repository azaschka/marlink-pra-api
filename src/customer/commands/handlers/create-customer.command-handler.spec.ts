import { ConflictException } from '@nestjs/common';
import { CommandBus, EventBus, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { GroupPolicy } from '../../../group-policy/models';
import { RetrieveGroupPoliciesQuery } from '../../../group-policy/queries';
import { BillingType, BusinessUnit } from '../../enums';
import { CustomerCreatedEvent } from '../../events';
import { RetrieveCustomersQuery } from '../../queries';
import { CustomerEntity } from '../../repositories/entities';
import { CustomerRepositoryService } from '../../repositories/services/customer-repository.service';
import { CustomerUtility } from '../../utilities';
import { CreateCustomerCommand } from '../create-customer.command';
import { CreateCustomerCommandHandler } from './create-customer.command-handler';

describe('CreateCustomerCommandHandler', () => {
    let appConfigService: AppConfigService;
    let commandBus: CommandBus;
    let queryBus: QueryBus;
    let eventBus: EventBus;
    let customerRepositoryService: CustomerRepositoryService;
    let handler: CreateCustomerCommandHandler;

    beforeEach(() => {
        mockCustomerUtility();
        appConfigService = mockAppConfigService();
        commandBus = mockCommandBus();
        queryBus = mockQueryBus();
        eventBus = mockEventBus();
        customerRepositoryService = mockCustomerRepositoryService();
        handler = new CreateCustomerCommandHandler(
            appConfigService,
            commandBus,
            queryBus,
            eventBus,
            customerRepositoryService,
        );
    });

    describe('execute', () => {
        it('should throw ConflictException if a customer with the same key already exists', async () => {
            // Arrange
            const existingCustomer = { id: 1, key: 'customer-key-1', name: 'customer-name-1' } as CustomerEntity;
            const queryBusExecuteMethod = jest.spyOn(queryBus, 'execute').mockResolvedValue([existingCustomer]);

            // Act & Assert
            await expect(
                handler.execute(
                    new CreateCustomerCommand(
                        'transaction-1',
                        'customer-key-1',
                        'customer-name-1',
                        BusinessUnit.EG,
                        BillingType.User,
                    ),
                ),
            ).rejects.toThrow(ConflictException);
            expect(queryBusExecuteMethod).toHaveBeenCalledTimes(1);
            expect(queryBusExecuteMethod).toHaveBeenCalledWith(
                new RetrieveCustomersQuery('transaction-1', 1, 1, 'customer-key-1', undefined),
            );
        });

        it('should throw an error if a customer with the same name already exists', async () => {
            // Arrange
            const existingCustomer = { id: 1, key: 'customer-key-1', name: 'customer-name-1' } as CustomerEntity;
            const queryBusExecuteMethod = jest
                .spyOn(queryBus, 'execute')
                .mockResolvedValueOnce([]) // First call for key check
                .mockResolvedValueOnce([existingCustomer]); // Second call for name check

            // Act & Assert
            await expect(
                handler.execute(
                    new CreateCustomerCommand(
                        'transaction-1',
                        'customer-key-1',
                        'customer-name-1',
                        BusinessUnit.EG,
                        BillingType.User,
                    ),
                ),
            ).rejects.toThrow(ConflictException);
            expect(queryBusExecuteMethod).toHaveBeenCalledTimes(2);
            expect(queryBusExecuteMethod).toHaveBeenNthCalledWith(
                1,
                new RetrieveCustomersQuery('transaction-1', 1, 1, 'customer-key-1', undefined),
            );
            expect(queryBusExecuteMethod).toHaveBeenNthCalledWith(
                2,
                new RetrieveCustomersQuery('transaction-1', 1, 1, undefined, 'customer-name-1'),
            );
        });

        it('should call the repository service with correct parameters, publish an event and return the result (admin group policy exist)', async () => {
            // Arrange
            const commandBusExecuteMethod = jest.spyOn(commandBus, 'execute');
            const queryBusExecuteMethod = jest
                .spyOn(queryBus, 'execute')
                .mockResolvedValueOnce([]) // First call for key validation
                .mockResolvedValueOnce([]) // Second call for name validation
                .mockResolvedValueOnce([{ id: 456 }] as GroupPolicy[]); // Third call for admin group policy retrieval
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
                new CreateCustomerCommand(
                    'transaction-1',
                    'customer-key-1',
                    'customer-name-1',
                    BusinessUnit.EG,
                    BillingType.User,
                ),
            );

            // Assert
            expect(customerEntityCreateWithoutIdMethod).toHaveBeenCalledWith(
                'customer-key-1',
                'customer-name-1',
                BusinessUnit.EG,
                false,
                BillingType.User,
            );
            expect(queryBusExecuteMethod).toHaveBeenNthCalledWith(
                3,
                new RetrieveGroupPoliciesQuery('transaction-1', 1, 1, 'admin-customer-name-1'),
            );
            expect(commandBusExecuteMethod).not.toHaveBeenCalled();
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

        it('should call the repository service with correct parameters, publish an event and return the result (admin group policy not exist)', async () => {
            // Arrange
            const commandBusExecuteMethod = jest.spyOn(commandBus, 'execute');
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
                new CreateCustomerCommand(
                    'transaction-1',
                    'customer-key-1',
                    'customer-name-1',
                    BusinessUnit.EG,
                    BillingType.User,
                ),
            );

            // Assert
            expect(customerEntityCreateWithoutIdMethod).toHaveBeenCalledWith(
                'customer-key-1',
                'customer-name-1',
                BusinessUnit.EG,
                false,
                BillingType.User,
            );
            expect(commandBusExecuteMethod).toHaveBeenCalled();
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

function mockCustomerUtility() {
    jest.spyOn(CustomerUtility, 'generateAdminGroupPolicyName').mockImplementation(
        (adminGroupPolicyPrefix: string, customerName: string): string => {
            return `${adminGroupPolicyPrefix}${customerName}`;
        },
    );
    return CustomerUtility;
}

function mockAppConfigService() {
    return {
        customer: {
            groupPolicy: {
                adminPrefix: 'admin-',
            },
        },
    } as AppConfigService;
}

function mockCommandBus() {
    const commandBus = {} as CommandBus;
    commandBus.execute = jest.fn().mockResolvedValue({ id: 456 } as GroupPolicy);
    return commandBus;
}

function mockQueryBus() {
    const queryBus = {} as QueryBus;
    queryBus.execute = jest.fn().mockResolvedValue([]);
    return queryBus;
}

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
