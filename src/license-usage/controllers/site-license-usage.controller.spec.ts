import { CommandBus } from '@nestjs/cqrs';
import { UuidUtility } from '../../shared/utilities';
import { CalculateSiteLicenseUsageCommand } from '../commands';
import { SiteLicenseUsage } from '../models';
import { SiteLicenseUsageController } from './site-license-usage.controller';

describe('SiteLicenseUsageController', () => {
    let controller: SiteLicenseUsageController;
    let commandBus: CommandBus;

    beforeEach(() => {
        commandBus = mockCommandBus();
        controller = new SiteLicenseUsageController(commandBus);

        // Mocking UuidUtility.generate to return a fixed UUID
        UuidUtility.generate = jest.fn(() => 'uuid-123');
    });

    describe('calculateSiteLicenseUsage', () => {
        it('should execute the command bus with the correct parameters', async () => {
            const expectedResult = {} as SiteLicenseUsage;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.calculateSiteLicenseUsage(undefined, 1);

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(new CalculateSiteLicenseUsageCommand('uuid-123', 1));
            expect(result).toBe(expectedResult);
        });
    });
});

function mockCommandBus() {
    const commandBus = {} as CommandBus;
    commandBus.execute = jest.fn();

    return commandBus;
}
