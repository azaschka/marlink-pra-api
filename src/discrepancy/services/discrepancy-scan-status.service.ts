import { Injectable, NotFoundException } from '@nestjs/common';
import { ResourceReportRegistry } from '../../observability/services/resource-report-registry.service';
import { DiscrepancyScanStatus, ScanEntityTypeFailureDtoOutput, ScanStatusDtoOutput } from '../dtos/outputs';

interface TrackedScan {
    readonly tenantId: number;
    readonly status: ScanStatusDtoOutput;
}

/**
 * Status of manual "scan all" runs, kept in memory.
 *
 * - Tenant-scoped: a status is stored and read per tenant (X-Tenant-Id) and scan ID. A scan ID is a transaction
 *   ID that also appears in logs and payloads; it does not give access to the status of another tenant.
 * - At most one manual scan per tenant: begin() returns the scan that is already running for the tenant instead of
 *   starting a second one, so repeated clicks no longer start parallel full scans.
 * - Bounded: a finished status is kept for one hour, and at most MAX_ENTRIES statuses are kept (the oldest finished
 *   ones go first). Running scans are never evicted; there is at most one per tenant. Before, every scan stayed in
 *   the map until the process restarted.
 * - Honest: a scan in which entity types failed reports them in failedEntityTypes; if every type failed, the scan
 *   is "failed" rather than "completed".
 *
 * With more than one PRA API replica the status lives in the replica that started the scan (in-memory, as before).
 */
@Injectable()
export class DiscrepancyScanStatusService {
    public static readonly FINISHED_TTL_IN_MS = 60 * 60 * 1000;
    public static readonly MAX_ENTRIES = 200;

    private readonly scans = new Map<string, TrackedScan>();
    private readonly runningByTenant = new Map<number, string>();

    constructor(resourceReportRegistry: ResourceReportRegistry) {
        resourceReportRegistry.register('manualScans', () => this.stats());
    }

    /**
     * Starts tracking a manual scan for the tenant, or returns the scan that is already running for it.
     * `started` tells whether the caller has to run the scan.
     */
    public begin(tenantId: number, scanId: string, now = new Date()): { scanId: string; started: boolean } {
        const runningScanId = this.runningByTenant.get(tenantId);

        if (runningScanId !== undefined) {
            return { scanId: runningScanId, started: false };
        }

        const status = new ScanStatusDtoOutput();
        status.scanId = scanId;
        status.status = DiscrepancyScanStatus.Running;
        status.startedAt = now;
        const key = DiscrepancyScanStatusService.key(tenantId, scanId);
        // A re-used transaction ID replaces the earlier, finished status of the same tenant.
        this.scans.delete(key);
        this.scans.set(key, { tenantId, status });
        this.runningByTenant.set(tenantId, scanId);
        this.prune(now.getTime());

        return { scanId, started: true };
    }

    /**
     * Finishes the scan: "completed", with the failed entity types if there are any, or "failed" when no entity
     * type succeeded.
     */
    public complete(
        tenantId: number,
        scanId: string,
        scannedEntityTypes: number,
        failedEntityTypes: ScanEntityTypeFailureDtoOutput[],
        now = new Date(),
    ): void {
        const status = this.finish(tenantId, scanId, now);

        if (!status) {
            return;
        }

        if (failedEntityTypes.length > 0) {
            status.failedEntityTypes = failedEntityTypes;
        }

        if (scannedEntityTypes > 0 && failedEntityTypes.length >= scannedEntityTypes) {
            status.status = DiscrepancyScanStatus.Failed;
            status.error = `None of the ${scannedEntityTypes} entity types was scanned successfully`;
        } else {
            status.status = DiscrepancyScanStatus.Completed;
        }
    }

    public fail(tenantId: number, scanId: string, error: unknown, now = new Date()): void {
        const status = this.finish(tenantId, scanId, now);

        if (!status) {
            return;
        }

        status.status = DiscrepancyScanStatus.Failed;
        status.error = error instanceof Error ? error.message : String(error);
    }

    /** The status of a scan of this tenant; a scan of another tenant is reported as not found. */
    public get(tenantId: number, scanId: string, now = new Date()): ScanStatusDtoOutput {
        this.prune(now.getTime());
        const scan = this.scans.get(DiscrepancyScanStatusService.key(tenantId, scanId));

        if (!scan) {
            throw new NotFoundException(`Scan with ID "${scanId}" not found.`);
        }

        return scan.status;
    }

    public stats() {
        return { tracked: this.scans.size, running: this.runningByTenant.size };
    }

    private finish(tenantId: number, scanId: string, now: Date): ScanStatusDtoOutput | undefined {
        const scan = this.scans.get(DiscrepancyScanStatusService.key(tenantId, scanId));

        if (!scan) {
            return undefined;
        }

        if (this.runningByTenant.get(tenantId) === scanId) {
            this.runningByTenant.delete(tenantId);
        }

        scan.status.completedAt = now;

        return scan.status;
    }

    /** Drops finished statuses older than the TTL, then the oldest finished ones above the cap. */
    private prune(now: number): void {
        for (const [key, scan] of this.scans) {
            const completedAt = scan.status.completedAt?.getTime();

            if (completedAt !== undefined && now - completedAt > DiscrepancyScanStatusService.FINISHED_TTL_IN_MS) {
                this.scans.delete(key);
            }
        }

        if (this.scans.size <= DiscrepancyScanStatusService.MAX_ENTRIES) {
            return;
        }

        // Map order is insertion order, i.e. oldest scans first.
        for (const [key, scan] of this.scans) {
            if (this.scans.size <= DiscrepancyScanStatusService.MAX_ENTRIES) {
                return;
            }

            if (scan.status.completedAt !== undefined) {
                this.scans.delete(key);
            }
        }
    }

    private static key(tenantId: number, scanId: string): string {
        return `${tenantId}:${scanId}`;
    }
}
