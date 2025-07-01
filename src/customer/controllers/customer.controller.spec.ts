import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { UuidUtility } from '../../shared/utilities';
import { CreateCustomerCommand, DeactivateCustomerCommand, ModifyCustomerCommand } from '../commands';
import { BillingType } from '../enums';
import { Customer } from '../models';
import { RetrieveCustomersQuery } from '../queries';
import { CustomerController } from './customer.controller';

describe('CustomerController', () => {
    let controller: CustomerController;
    let commandBus: CommandBus;
    let queryBus: QueryBus;

    beforeEach(() => {
        commandBus = mockCommandBus();
        queryBus = mockQueryBus();
        controller = new CustomerController(commandBus, queryBus);

        // Mocking UuidUtility.generate to return a fixed UUID
        UuidUtility.generate = jest.fn(() => 'uuid-123');
    });

    describe('retrieveCustomers', () => {
        it('should execute the query bus with the correct parameters and return the result', async () => {
            const expectedResult = [] as Customer[];
            const queryBusExecuteSpy = jest.spyOn(queryBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.retrieveCustomers(undefined, {
                pageSize: 10,
                pageNumber: 1,
                key: 'customer-key-1',
                name: 'customer-name-1',
            });

            expect(queryBusExecuteSpy).toHaveBeenCalledWith(
                new RetrieveCustomersQuery('uuid-123', 10, 1, 'customer-key-1', 'customer-name-1'),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('createCustomer', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as Customer;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.createCustomer(undefined, {
                key: 'customer-key-1',
                name: 'customer-name-1',
                billingType: BillingType.Asset,
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new CreateCustomerCommand('uuid-123', 'customer-key-1', 'customer-name-1', BillingType.Asset),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('modifyCustomer', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as Customer;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.modifyCustomer(undefined, 1, {
                billingType: BillingType.Asset,
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new ModifyCustomerCommand('uuid-123', 1, BillingType.Asset),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('deactivateCustomer', () => {
        it('should execute the command bus with the correct parameters', async () => {
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute');

            await controller.deactivateCustomer(undefined, 1);

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(new DeactivateCustomerCommand('uuid-123', 1));
        });
    });
});

function mockCommandBus() {
    const commandBus = {} as CommandBus;
    commandBus.execute = jest.fn();

    return commandBus;
}

function mockQueryBus() {
    const queryBus = {} as QueryBus;
    queryBus.execute = jest.fn();

    return queryBus;
}
