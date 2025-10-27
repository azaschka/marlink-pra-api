import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { DiscrepancyDtoOutput, DiscrepancyOverviewDtoOutput } from '../dtos/outputs';
import { DiscrepancyEntityType } from '../enums';
import { DiscrepancyScannerController } from './discrepancy-scanner.controller';

describe('DiscrepancyScannerController', () => {
    let commandBus: CommandBus;
    let queryBus: QueryBus;
    let controller: DiscrepancyScannerController;

    beforeEach(() => {
        // Mock console.log to prevent cluttering the test output
        jest.spyOn(console, 'log').mockImplementation(() => {});
        commandBus = mockCommandBus();
        queryBus = mockQueryBus();
        controller = new DiscrepancyScannerController(queryBus, commandBus);
    });

    describe('scanAllDiscrepancies', () => {
        it('should attempt to scan discrepancies for all entity types', async () => {
            const scanDiscrepanciesSpy = jest
                .spyOn(controller, 'scanDiscrepancies')
                .mockResolvedValue({} as DiscrepancyOverviewDtoOutput);

            await controller.scanAllDiscrepancies('transaction-id-1', 123);

            expect(scanDiscrepanciesSpy).toHaveBeenCalledTimes(13);
        });
    });

    describe('scanDiscrepancies', () => {
        it('should execute the ScanDiscrepancyCommand with correct parameters', async () => {
            const expectedOverview = {} as DiscrepancyOverviewDtoOutput;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedOverview);

            const result = await controller.scanDiscrepancies(
                'transaction-id-2',
                456,
                DiscrepancyEntityType.GroupPolicy,
            );

            expect(result).toBe(expectedOverview);
            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    transactionId: 'transaction-id-2',
                    tenantId: 456,
                    entityType: DiscrepancyEntityType.GroupPolicy,
                }),
            );
        });
    });

    describe('retrieveDiscrepancies', () => {
        it('should execute the RetrieveDiscrepanciesQuery with correct parameters', async () => {
            const expectedDiscrepancies = [] as DiscrepancyDtoOutput[];
            const queryBusExecuteSpy = jest.spyOn(queryBus, 'execute').mockResolvedValue(expectedDiscrepancies);

            const result = await controller.retrieveDiscrepancies('transaction-id', 123, {
                entityId: 1001,
                entityType: DiscrepancyEntityType.JumpGroup,
                pageSize: 25,
                pageNumber: 2,
            });

            expect(result).toBe(expectedDiscrepancies);
            expect(queryBusExecuteSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    transactionId: 'transaction-id',
                    tenantId: 123,
                    pageSize: 25,
                    pageNumber: 2,
                    entityType: DiscrepancyEntityType.JumpGroup,
                    entityId: 1001,
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

function mockQueryBus() {
    const queryBus = {} as QueryBus;

    queryBus.execute = jest.fn();

    return queryBus;
}
