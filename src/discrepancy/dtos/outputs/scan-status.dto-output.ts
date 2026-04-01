import { ApiProperty } from '@nestjs/swagger';

export enum DiscrepancyScanStatus {
    Running = 'running',
    Completed = 'completed',
    Failed = 'failed',
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
}
