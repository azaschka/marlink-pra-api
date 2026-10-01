import { ConflictException, NotFoundException } from '@nestjs/common';
import { DiscrepancyScanStatus } from '../dtos/outputs';
import { DiscrepancyEntityType, DiscrepancyScanState } from '../enums';
import { DiscrepancyScanStatusService } from './discrepancy-scan-status.service';

describe('DiscrepancyScanStatusService', () => {
    const t0 = new Date('2026-10-01T08:00:00Z');
    const at = (minutes: number) => new Date(t0.getTime() + minutes * 60 * 1000);
    let service: DiscrepancyScanStatusService;

    beforeEach(() => {
        service = new DiscrepancyScanStatusService();
    });

    describe('one manual scan per tenant', () => {
        it('returns the running scan instead of starting a second one, but lets another tenant start', () => {
            expect(service.begin(1, 'scan-a', t0)).toEqual({ scanId: 'scan-a', started: true });
            expect(service.begin(1, 'scan-b', at(1))).toEqual({ scanId: 'scan-a', started: false });
            expect(service.begin(2, 'scan-c', at(1))).toEqual({ scanId: 'scan-c', started: true });
            expect(() => service.get('scan-b')).toThrow(NotFoundException);
        });

        it('allows a new scan once the previous one finished, also after a failure', () => {
            service.begin(1, 'scan-a', t0);
            service.complete('scan-a', 14, [], at(5));
            expect(service.begin(1, 'scan-b', at(6))).toEqual({ scanId: 'scan-b', started: true });

            service.fail('scan-b', new Error('boom'), at(7));
            expect(service.begin(1, 'scan-c', at(8))).toEqual({ scanId: 'scan-c', started: true });
        });

        it('refuses to reuse the ID of a running scan of another tenant', () => {
            service.begin(1, 'same-id', t0);

            expect(() => service.begin(2, 'same-id', at(1))).toThrow(ConflictException);
            expect(service.get('same-id', at(1)).status).toBe(DiscrepancyScanStatus.Running);
        });
    });

    describe('honest result', () => {
        it('is completed without failedEntityTypes when everything succeeded', () => {
            service.begin(1, 'scan-a', t0);
            service.complete('scan-a', 14, [], at(2));

            const status = service.get('scan-a', at(2));
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
            service.complete('scan-a', 14, failures, at(2));

            expect(service.get('scan-a', at(2))).toEqual(
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
            service.complete('scan-a', 2, failures, at(2));

            expect(service.get('scan-a', at(2))).toEqual(
                expect.objectContaining({
                    status: DiscrepancyScanStatus.Failed,
                    error: 'All 2 entity types failed',
                    failedEntityTypes: failures,
                }),
            );
        });
    });

    describe('bounded', () => {
        it('evicts a finished status one hour after it finished, never a running one', () => {
            service.begin(1, 'finished', t0);
            service.complete('finished', 14, [], at(10));
            service.begin(2, 'running', t0);

            expect(service.get('finished', at(70)).status).toBe(DiscrepancyScanStatus.Completed);
            expect(() => service.get('finished', at(71))).toThrow(NotFoundException);
            expect(service.get('running', at(24 * 60)).status).toBe(DiscrepancyScanStatus.Running);
        });

        it('keeps at most 200 statuses, dropping the oldest finished ones first', () => {
            for (let i = 0; i < 250; i++) {
                service.begin(i, `scan-${i}`, at(i / 100));
                service.complete(`scan-${i}`, 14, [], at(i / 100));
            }
            service.begin(9999, 'running', at(3));

            expect(service.stats()).toEqual({ tracked: 200, running: 1 });
            expect(() => service.get('scan-50', at(3))).toThrow(NotFoundException);
            expect(service.get('scan-249', at(3)).status).toBe(DiscrepancyScanStatus.Completed);
            expect(service.get('running', at(3)).status).toBe(DiscrepancyScanStatus.Running);
        });

        it('stays bounded over a day of scans started every minute (before: one entry per scan, forever)', () => {
            for (let minute = 0; minute < 24 * 60; minute++) {
                service.begin(minute % 5, `scan-${minute}`, at(minute));
                service.complete(`scan-${minute}`, 14, [], at(minute + 0.5));
            }

            expect(service.stats().tracked).toBeLessThanOrEqual(61);
        });
    });
});
