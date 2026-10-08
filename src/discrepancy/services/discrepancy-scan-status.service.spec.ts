import { NotFoundException } from '@nestjs/common';
import { ResourceReportRegistry } from '../../observability/services/resource-report-registry.service';
import { DiscrepancyScanStatus } from '../dtos/outputs';
import { DiscrepancyEntityType, DiscrepancyScanState } from '../enums';
import { DiscrepancyScanStatusService } from './discrepancy-scan-status.service';

describe('DiscrepancyScanStatusService', () => {
    const t0 = new Date('2026-10-01T08:00:00Z');
    const at = (minutes: number) => new Date(t0.getTime() + minutes * 60 * 1000);
    let service: DiscrepancyScanStatusService;
    let registry: ResourceReportRegistry;

    beforeEach(() => {
        registry = new ResourceReportRegistry();
        service = new DiscrepancyScanStatusService(registry);
    });

    describe('one manual scan per tenant', () => {
        it('returns the running scan instead of starting a second one, but lets another tenant start', () => {
            expect(service.begin(1, 'scan-a', t0)).toEqual({ scanId: 'scan-a', started: true });
            expect(service.begin(1, 'scan-b', at(1))).toEqual({ scanId: 'scan-a', started: false });
            expect(service.begin(2, 'scan-c', at(1))).toEqual({ scanId: 'scan-c', started: true });
            expect(() => service.get(1, 'scan-b')).toThrow(NotFoundException);
        });

        it('allows a new scan once the previous one finished, also after a failure', () => {
            service.begin(1, 'scan-a', t0);
            service.complete(1, 'scan-a', 14, [], at(5));
            expect(service.begin(1, 'scan-b', at(6))).toEqual({ scanId: 'scan-b', started: true });

            service.fail(1, 'scan-b', new Error('boom'), at(7));
            expect(service.begin(1, 'scan-c', at(8))).toEqual({ scanId: 'scan-c', started: true });
        });

        it('keeps the scans of two tenants apart, also with the same scan ID', () => {
            expect(service.begin(1, 'same-id', t0)).toEqual({ scanId: 'same-id', started: true });
            expect(service.begin(2, 'same-id', at(1))).toEqual({ scanId: 'same-id', started: true });
            service.complete(2, 'same-id', 14, [], at(2));

            expect(service.get(1, 'same-id', at(2)).status).toBe(DiscrepancyScanStatus.Running);
            expect(service.get(2, 'same-id', at(2)).status).toBe(DiscrepancyScanStatus.Completed);
        });
    });

    describe('honest result', () => {
        it('is completed without failedEntityTypes when everything succeeded', () => {
            service.begin(1, 'scan-a', t0);
            service.complete(1, 'scan-a', 14, [], at(2));

            const status = service.get(1, 'scan-a', at(2));
            expect(status.status).toBe(DiscrepancyScanStatus.Completed);
            expect(status.failedEntityTypes).toBeUndefined();
            expect(status.completedAt).toEqual(at(2));
        });

        it('is completed and lists the entity types that failed', () => {
            service.begin(1, 'scan-a', t0);
            const failures = [
                { entityType: DiscrepancyEntityType.User, state: DiscrepancyScanState.Failed, reason: 'NotFound' },
                { entityType: DiscrepancyEntityType.Team, state: DiscrepancyScanState.Aborted },
            ];
            service.complete(1, 'scan-a', 14, failures, at(2));

            expect(service.get(1, 'scan-a', at(2))).toEqual(
                expect.objectContaining({ status: DiscrepancyScanStatus.Completed, failedEntityTypes: failures }),
            );
        });

        it('is failed when every entity type failed (before: "completed")', () => {
            service.begin(1, 'scan-a', t0);
            const failures = [DiscrepancyEntityType.User, DiscrepancyEntityType.Team].map((entityType) => ({
                entityType,
                state: DiscrepancyScanState.Failed,
                reason: 'HTTP 504: The PRA Sync API did not answer within 1500000 ms',
            }));
            service.complete(1, 'scan-a', 2, failures, at(2));

            expect(service.get(1, 'scan-a', at(2))).toEqual(
                expect.objectContaining({
                    status: DiscrepancyScanStatus.Failed,
                    error: 'None of the 2 entity types was scanned successfully',
                    failedEntityTypes: failures,
                }),
            );
        });
    });

    describe('tenant-scoped', () => {
        it('reports the scan of another tenant as not found, so a scan ID alone gives no access', () => {
            service.begin(1, 'scan-a', t0);
            service.complete(1, 'scan-a', 14, [], at(1));

            expect(() => service.get(2, 'scan-a', at(1))).toThrow(NotFoundException);
            expect(service.get(1, 'scan-a', at(1)).status).toBe(DiscrepancyScanStatus.Completed);
        });

        it('ignores a completion reported for the wrong tenant', () => {
            service.begin(1, 'scan-a', t0);
            service.complete(2, 'scan-a', 14, [], at(1));

            expect(service.get(1, 'scan-a', at(1)).status).toBe(DiscrepancyScanStatus.Running);
        });
    });

    describe('bounded', () => {
        it('evicts a finished status one hour after it finished, never a running one', () => {
            service.begin(1, 'finished', t0);
            service.complete(1, 'finished', 14, [], at(10));
            service.begin(2, 'running', t0);

            expect(service.get(1, 'finished', at(70)).status).toBe(DiscrepancyScanStatus.Completed);
            expect(() => service.get(1, 'finished', at(71))).toThrow(NotFoundException);
            expect(service.get(2, 'running', at(24 * 60)).status).toBe(DiscrepancyScanStatus.Running);
        });

        it('keeps at most 200 statuses, dropping the oldest finished ones first', () => {
            for (let i = 0; i < 250; i++) {
                service.begin(i, `scan-${i}`, at(i / 100));
                service.complete(i, `scan-${i}`, 14, [], at(i / 100));
            }
            service.begin(9999, 'running', at(3));

            expect(service.stats()).toEqual({ tracked: 200, running: 1 });
            expect(registry.collect()).toEqual({ manualScans: { tracked: 200, running: 1 } });
            expect(() => service.get(50, 'scan-50', at(3))).toThrow(NotFoundException);
            expect(service.get(249, 'scan-249', at(3)).status).toBe(DiscrepancyScanStatus.Completed);
            expect(service.get(9999, 'running', at(3)).status).toBe(DiscrepancyScanStatus.Running);
        });

        it('stays bounded over a day of scans started every minute (before: one entry per scan, forever)', () => {
            for (let minute = 0; minute < 24 * 60; minute++) {
                service.begin(minute % 5, `scan-${minute}`, at(minute));
                service.complete(minute % 5, `scan-${minute}`, 14, [], at(minute + 0.5));
            }

            expect(service.stats().tracked).toBeLessThanOrEqual(61);
        });
    });
});
