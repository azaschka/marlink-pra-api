import { CommandBus } from '@nestjs/cqrs';
import { UuidUtility } from '../../shared/utilities';
import { CalculateCustomerLicenseUsageCommand } from '../commands';
import { CustomerLicenseUsage } from '../models';
import { CustomerLicenseUsageController } from './customer-license-usage.controller';

describe('CustomerLicenseUsageController', () => {
    let controller: CustomerLicenseUsageController;
    let commandBus: CommandBus;

    beforeEach(() => {
        commandBus = mockCommandBus();
        controller = new CustomerLicenseUsageController(commandBus);

        // Mocking UuidUtility.generate to return a fixed UUID
        UuidUtility.generate = jest.fn(() => 'uuid-123');
    });

    describe('calculateCustomerLicenseUsage', () => {
        it('should execute the command bus with the correct parameters', async () => {
            const expectedResult = {} as CustomerLicenseUsage;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.calculateCustomerLicenseUsage(undefined, 1);

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(new CalculateCustomerLicenseUsageCommand('uuid-123', 1));
            expect(result).toBe(expectedResult);
        });
    });
});

function mockCommandBus() {
    const commandBus = {} as CommandBus;
    commandBus.execute = jest.fn();

    return commandBus;
}
