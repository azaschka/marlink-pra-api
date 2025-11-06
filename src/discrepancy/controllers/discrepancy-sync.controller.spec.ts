import { CommandBus } from '@nestjs/cqrs';
import { DiscrepancySyncType } from '../enums';
import { DiscrepancySyncController } from './discrepancy-sync.controller';

describe('DiscrepancySyncController', () => {
    let commandBus: CommandBus;
    let controller: DiscrepancySyncController;

    beforeEach(() => {
        commandBus = mockCommandBus();
        controller = new DiscrepancySyncController(commandBus);
    });

    describe('syncDiscrepancy', () => {
        it('should execute the command with correct parameters', async () => {
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute');

            await controller.syncDiscrepancy('transaction-id-1', 123, 456, {
                syncType: DiscrepancySyncType.ExternalToInternal,
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    transactionId: 'transaction-id-1',
                    tenantId: 123,
                    id: 456,
                    syncType: DiscrepancySyncType.ExternalToInternal,
                }),
            );
        });
    });
});

function mockCommandBus() {
    const commandBus = {} as CommandBus;

    commandBus.execute = jest.fn();

    return commandBus;
}
