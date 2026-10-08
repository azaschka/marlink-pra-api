import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { AxiosError, AxiosResponse } from 'axios';
import { ResourceReportRegistry } from '../../observability/services/resource-report-registry.service';
import { ErrorProcessorUtility } from '../../shared/utilities';
import { ScanDiscrepancyCommand } from '../commands';
import { DiscrepancyScanStatus } from '../dtos/outputs';
import { DiscrepancyEntityType, DiscrepancyScanState } from '../enums';
import { DiscrepancyScanStatusService } from './discrepancy-scan-status.service';
import { ManualDiscrepancyScanService } from './manual-discrepancy-scan.service';

const ENTITY_TYPES = ManualDiscrepancyScanService.ENTITY_TYPE_ORDER;
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

/** What the scan command of an entity type answers (as the composed errors of ScanDiscrepancyCommandHandler). */
type Answer = (entityType: DiscrepancyEntityType) => Promise<unknown>;

describe('ManualDiscrepancyScanService', () => {
    let execute: jest.Mock<Promise<unknown>, [ScanDiscrepancyCommand]>;
    let statusService: DiscrepancyScanStatusService;
    let service: ManualDiscrepancyScanService;

    const answering = (answer: Answer) => execute.mockImplementation((command) => answer(command.entityType));

    beforeEach(() => {
        jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
        jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
        execute = jest.fn<Promise<unknown>, [ScanDiscrepancyCommand]>();
        statusService = new DiscrepancyScanStatusService(new ResourceReportRegistry());
        service = new ManualDiscrepancyScanService({ execute } as unknown as CommandBus, statusService);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('scans every entity type once and reports a completed scan', async () => {
        answering(() => Promise.resolve({ state: DiscrepancyScanState.Succeeded }));

        expect(service.start('scan-1', 123)).toEqual({ scanId: 'scan-1' });
        await flush();

        expect(execute.mock.calls.map(([command]) => command.entityType)).toEqual([...ENTITY_TYPES]);
        expect(execute.mock.calls[0]?.[0]).toEqual(
            new ScanDiscrepancyCommand('scan-1', 123, DiscrepancyEntityType.User),
        );
        expect(statusService.get(123, 'scan-1')).toEqual(
            expect.objectContaining({ status: DiscrepancyScanStatus.Completed, failedEntityTypes: undefined }),
        );
    });

    it('returns the running scan for a second request of the same tenant instead of scanning twice', async () => {
        const releases: (() => void)[] = [];
        answering(() => new Promise((resolve) => releases.push(() => resolve({}))));

        expect(service.start('click-1', 123)).toEqual({ scanId: 'click-1' });
        expect(service.start('click-2', 123)).toEqual({ scanId: 'click-1' });
        expect(service.start('click-3', 456)).toEqual({ scanId: 'click-3' });

        while (releases.length > 0) {
            releases.splice(0).forEach((release) => release());
            await flush();
        }

        // 14 entity types for tenant 123 and 14 for tenant 456, not 42.
        expect(execute.mock.calls).toHaveLength(28);
        expect(statusService.get(123, 'click-1').status).toBe(DiscrepancyScanStatus.Completed);
        expect(() => statusService.get(123, 'click-2')).toThrow(); // never started
    });

    it('reports the entity types that failed, whether the call failed or the Sync API reported it', async () => {
        const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
        answering((entityType) => {
            if (entityType === DiscrepancyEntityType.User) {
                return Promise.reject(new HttpException({ message: 'Bad gateway' }, HttpStatus.BAD_GATEWAY));
            }

            return Promise.resolve(
                entityType === DiscrepancyEntityType.Team
                    ? { state: DiscrepancyScanState.Failed, failureKind: 'NotFound' }
                    : { state: DiscrepancyScanState.Succeeded },
            );
        });

        statusService.begin(123, 'scan-2');
        await service.run('scan-2', 123);

        expect(statusService.get(123, 'scan-2')).toEqual(
            expect.objectContaining({
                status: DiscrepancyScanStatus.Completed,
                failedEntityTypes: [
                    {
                        entityType: DiscrepancyEntityType.User,
                        state: DiscrepancyScanState.Failed,
                        reason: 'HTTP 502: Bad gateway',
                    },
                    { entityType: DiscrepancyEntityType.Team, state: DiscrepancyScanState.Failed, reason: 'NotFound' },
                ],
            }),
        );
        expect(warn).toHaveBeenCalledWith(
            expect.stringMatching(
                /^\[manual scan scan-2\] tenant 123 finished in \d+s: 12 succeeded, 2 failed \(user: failed, HTTP 502/,
            ),
        );
    });

    it('counts a Sync API without scan state (before 3.2) as succeeded, as before', async () => {
        answering(() => Promise.resolve({ entityType: DiscrepancyEntityType.User, totalBtData: 1 }));
        statusService.begin(123, 'scan-1');

        await service.run('scan-1', 123);

        expect(statusService.get(123, 'scan-1').status).toBe(DiscrepancyScanStatus.Completed);
    });

    it('is failed when no entity type succeeded', async () => {
        answering(() => Promise.reject(new HttpException('connect ECONNREFUSED', HttpStatus.INTERNAL_SERVER_ERROR)));
        statusService.begin(123, 'scan-1');

        await service.run('scan-1', 123);

        expect(execute.mock.calls).toHaveLength(14); // fast failures do not stop the other types
        expect(statusService.get(123, 'scan-1')).toEqual(
            expect.objectContaining({
                status: DiscrepancyScanStatus.Failed,
                error: 'None of the 14 entity types was scanned successfully',
            }),
        );
    });

    it('does not attempt the remaining types once the Sync API did not answer within the scan timeout', async () => {
        const timeout = ErrorProcessorUtility.composeError(
            new AxiosError('timeout of 1500000ms exceeded', AxiosError.ECONNABORTED, { timeout: 1500000 } as never),
        );
        answering((entityType) =>
            entityType === DiscrepancyEntityType.GroupPolicy
                ? Promise.reject(timeout)
                : Promise.resolve({ state: DiscrepancyScanState.Succeeded }),
        );
        statusService.begin(123, 'scan-1');

        await service.run('scan-1', 123);

        expect(execute.mock.calls).toHaveLength(2); // user, then group policy timed out
        const status = statusService.get(123, 'scan-1');
        expect(status.status).toBe(DiscrepancyScanStatus.Completed); // user succeeded
        expect(status.failedEntityTypes?.[0]).toEqual({
            entityType: DiscrepancyEntityType.GroupPolicy,
            state: DiscrepancyScanState.Failed,
            reason: 'HTTP 504: The PRA Sync API did not answer within 1500000 ms',
        });
        expect(status.failedEntityTypes?.slice(1)).toEqual(
            ENTITY_TYPES.slice(2).map((entityType) => ({
                entityType,
                state: DiscrepancyScanState.Aborted,
                reason: 'not scanned: the PRA Sync API did not answer in time',
            })),
        );
    });

    it('keeps scanning after a 504 that the Sync API itself answered', async () => {
        const gatewayTimeoutFromSync = ErrorProcessorUtility.composeError(
            new AxiosError('x', 'ERR_BAD_RESPONSE', undefined, undefined, {
                status: 504,
                data: { message: 'Gateway Timeout' },
            } as AxiosResponse),
        );
        answering((entityType) =>
            entityType === DiscrepancyEntityType.User
                ? Promise.reject(gatewayTimeoutFromSync)
                : Promise.resolve({ state: DiscrepancyScanState.Succeeded }),
        );
        statusService.begin(123, 'scan-1');

        await service.run('scan-1', 123);

        expect(execute.mock.calls).toHaveLength(14);
        expect(statusService.get(123, 'scan-1').failedEntityTypes).toHaveLength(1);
    });

    it('bounds the reason of a failed call to 200 characters', async () => {
        answering(() => Promise.reject(new Error('x'.repeat(500))));
        statusService.begin(123, 'scan-1');

        await service.run('scan-1', 123);

        expect(statusService.get(123, 'scan-1').failedEntityTypes?.[0]?.reason).toHaveLength(200);
    });
});
