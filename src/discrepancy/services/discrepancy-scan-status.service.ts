import { Injectable, NotFoundException } from '@nestjs/common';
import { DiscrepancyScanStatus, ScanStatusDtoOutput } from '../dtos/outputs';

@Injectable()
export class DiscrepancyScanStatusService {
    private readonly statuses = new Map<string, ScanStatusDtoOutput>();

    public start(scanId: string): void {
        const status = new ScanStatusDtoOutput();
        status.scanId = scanId;
        status.status = DiscrepancyScanStatus.Running;
        status.startedAt = new Date();
        this.statuses.set(scanId, status);
    }

    public complete(scanId: string): void {
        const status = this.statuses.get(scanId);
        if (!status) return;
        status.status = DiscrepancyScanStatus.Completed;
        status.completedAt = new Date();
    }

    public fail(scanId: string, error: unknown): void {
        const status = this.statuses.get(scanId);
        if (!status) return;
        status.status = DiscrepancyScanStatus.Failed;
        status.completedAt = new Date();
        status.error = error instanceof Error ? error.message : String(error);
    }

    public get(scanId: string): ScanStatusDtoOutput {
        const status = this.statuses.get(scanId);
        if (!status) {
            throw new NotFoundException(`Scan with ID "${scanId}" not found.`);
        }
        return status;
    }
}
