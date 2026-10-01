import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { DiscrepancyDtoOutput, DiscrepancyOverviewDtoOutput, DiscrepancyScanStatus } from '../dtos/outputs';
import { DiscrepancyEntityType, DiscrepancyScanState } from '../enums';
import { DiscrepancyScanStatusService } from '../services/discrepancy-scan-status.service';
import { DiscrepancyScannerController } from './discrepancy-scanner.controller';

describe('DiscrepancyScannerController', () => {
    let commandBus: CommandBus;
    let queryBus: QueryBus;
    let controller: DiscrepancyScannerController;
    let scanStatusService: DiscrepancyScanStatusService;

    // The controller is request-scoped: every request gets a new instance, the status service is shared.
    const newController = () => new DiscrepancyScannerController(queryBus, commandBus, scanStatusService);
    const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

    beforeEach(() => {
        jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
        jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
        commandBus = mockCommandBus();
        queryBus = mockQueryBus();
        scanStatusService = new DiscrepancyScanStatusService();
        controller = newController();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('scanAllDiscrepancies', () => {
        it('should return a scanId and kick off scans for all entity types', async () => {
            const scanDiscrepanciesSpy = jest
                .spyOn(controller, 'scanDiscrepancies')
                .mockResolvedValue({} as DiscrepancyOverviewDtoOutput);

            const result = controller.scanAllDiscrepancies('transaction-id-1', 123);

            expect(result).toEqual({ scanId: 'transaction-id-1' });

            // Flush the microtask queue so the fire-and-forget runAllScans completes
            await flush();

            expect(scanDiscrepanciesSpy).toHaveBeenCalledTimes(14);
            expect(scanStatusService.get('transaction-id-1').status).toBe(DiscrepancyScanStatus.Completed);
        });

        it('returns the running scan for a second request of the same tenant instead of scanning twice', async () => {
            const releases: (() => void)[] = [];
            jest.spyOn(commandBus, 'execute').mockImplementation(
                () => new Promise((resolve) => releases.push(() => resolve({}))),
            );

            const first = controller.scanAllDiscrepancies('click-1', 123);
            const second = newController().scanAllDiscrepancies('click-2', 123);
            const otherTenant = newController().scanAllDiscrepancies('click-3', 456);

            expect(first).toEqual({ scanId: 'click-1' });
            expect(second).toEqual({ scanId: 'click-1' });
            expect(otherTenant).toEqual({ scanId: 'click-3' });

            while (releases.length > 0) {
                releases.splice(0).forEach((release) => release());
                await flush();
            }

            // 14 entity types for tenant 123 and 14 for tenant 456, not 42.
            expect((commandBus.execute as jest.Mock).mock.calls).toHaveLength(28);
            expect(scanStatusService.get('click-1').status).toBe(DiscrepancyScanStatus.Completed);
        });

        it('reports the entity types that failed, whether the call failed or the Sync API reported it', async () => {
            const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
            jest.spyOn(controller, 'scanDiscrepancies').mockImplementation((_transactionId, _tenantId, entityType) => {
                if (entityType === DiscrepancyEntityType.User) {
                    return Promise.reject(
                        new HttpException(
                            'The PRA Sync API did not answer within 1500000 ms',
                            HttpStatus.GATEWAY_TIMEOUT,
                        ),
                    );
                }

                return Promise.resolve({
                    state:
                        entityType === DiscrepancyEntityType.Team
                            ? DiscrepancyScanState.Failed
                            : DiscrepancyScanState.Succeeded,
                    failureKind: entityType === DiscrepancyEntityType.Team ? 'NotFound' : undefined,
                } as DiscrepancyOverviewDtoOutput);
            });

            controller.scanAllDiscrepancies('scan-1', 123);
            await flush();

            expect(scanStatusService.get('scan-1')).toEqual(
                expect.objectContaining({
                    status: DiscrepancyScanStatus.Completed,
                    failedEntityTypes: [
                        {
                            entityType: DiscrepancyEntityType.User,
                            state: DiscrepancyScanState.Failed,
                            reason: 'HTTP 504: The PRA Sync API did not answer within 1500000 ms',
                        },
                        {
                            entityType: DiscrepancyEntityType.Team,
                            state: DiscrepancyScanState.Failed,
                            reason: 'NotFound',
                        },
                    ],
                }),
            );
            expect(warn).toHaveBeenCalledWith(
                expect.stringMatching(
                    /^\[manual scan scan-1\] tenant 123 finished in \d+s: 12 succeeded, 2 failed \(user: failed, HTTP 504/,
                ),
            );
        });

        it('is failed, not completed, when every entity type failed', async () => {
            jest.spyOn(controller, 'scanDiscrepancies').mockRejectedValue(new Error('connect ECONNREFUSED'));

            controller.scanAllDiscrepancies('scan-1', 123);
            await flush();

            expect(scanStatusService.get('scan-1')).toEqual(
                expect.objectContaining({ status: DiscrepancyScanStatus.Failed, error: 'All 14 entity types failed' }),
            );
            expect(scanStatusService.get('scan-1').failedEntityTypes).toHaveLength(14);
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
