import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ScanAllDiscrepanciesCommand } from '../commands';
import {
    DiscrepancyDtoOutput,
    DiscrepancyOverviewDtoOutput,
    DiscrepancyScanStatus,
    ScanStatusDtoOutput,
} from '../dtos/outputs';
import { DiscrepancyEntityType } from '../enums';
import { RetrieveDiscrepancyScanStatusQuery } from '../queries';
import { DiscrepancyScannerController } from './discrepancy-scanner.controller';

describe('DiscrepancyScannerController', () => {
    let commandBus: CommandBus;
    let queryBus: QueryBus;
    let controller: DiscrepancyScannerController;

    beforeEach(() => {
        commandBus = mockCommandBus();
        queryBus = mockQueryBus();
        controller = new DiscrepancyScannerController(queryBus, commandBus);
    });

    describe('scanAllDiscrepancies', () => {
        it('should dispatch the ScanAllDiscrepanciesCommand and return the scanId', async () => {
            const execute = jest.spyOn(commandBus, 'execute').mockResolvedValue({ scanId: 'transaction-id-1' });

            const result = await controller.scanAllDiscrepancies('transaction-id-1', 123);

            expect(result).toEqual({ scanId: 'transaction-id-1' });
            expect(execute).toHaveBeenCalledWith(new ScanAllDiscrepanciesCommand('transaction-id-1', 123));
        });
    });

    describe('getScanStatus', () => {
        it('should query the status of the scan within the tenant of the request', async () => {
            const status = { scanId: 'scan-1', status: DiscrepancyScanStatus.Running } as ScanStatusDtoOutput;
            const execute = jest.spyOn(queryBus, 'execute').mockResolvedValue(status);

            const result = await controller.getScanStatus('transaction-id-2', 456, 'scan-1');

            expect(result).toBe(status);
            expect(execute).toHaveBeenCalledWith(
                new RetrieveDiscrepancyScanStatusQuery('transaction-id-2', 456, 'scan-1'),
            );
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
