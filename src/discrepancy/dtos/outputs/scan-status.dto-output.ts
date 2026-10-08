import { ApiProperty } from '@nestjs/swagger';
import { DiscrepancyEntityType, DiscrepancyScanState } from '../../enums';

export enum DiscrepancyScanStatus {
    Running = 'running',
    Completed = 'completed',
    Failed = 'failed',
}

export class ScanEntityTypeFailureDtoOutput {
    @ApiProperty({ required: true, enum: DiscrepancyEntityType, description: 'The entity type that failed.' })
    public entityType!: DiscrepancyEntityType;

    @ApiProperty({
        required: true,
        enum: [
            DiscrepancyScanState.Failed,
            DiscrepancyScanState.Partial,
            DiscrepancyScanState.Skipped,
            DiscrepancyScanState.Aborted,
        ],
        description: 'State reported by the Sync API; "failed" also when the Sync API call itself failed.',
    })
    public state!: DiscrepancyScanState;

    @ApiProperty({
        required: false,
        type: String,
        description: 'Error kind from the Sync API, or the HTTP status and a short message of the failed call.',
    })
    public reason?: string;
}

export class ScanStatusDtoOutput {
    @ApiProperty({ required: true, type: String, description: 'The scan ID (transaction ID).' })
    public scanId!: string;

    @ApiProperty({ required: true, enum: DiscrepancyScanStatus, description: 'The current scan status.' })
    public status!: DiscrepancyScanStatus;

    @ApiProperty({ required: true, type: Date, description: 'When the scan was started.' })
    public startedAt!: Date;

    @ApiProperty({ required: false, type: Date, description: 'When the scan completed.' })
    public completedAt?: Date;

    @ApiProperty({ required: false, type: String, description: 'Error message if the scan failed.' })
    public error?: string;

    @ApiProperty({
        required: false,
        type: [ScanEntityTypeFailureDtoOutput],
        description:
            'Entity types whose scan did not succeed. Absent when every entity type succeeded. If every type failed, the status is "failed".',
    })
    public failedEntityTypes?: ScanEntityTypeFailureDtoOutput[];
}
