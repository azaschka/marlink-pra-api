import { ApiProperty } from '@nestjs/swagger';
import { MonitoringRecordRetrievedDtoOutput } from './monitoring-record-retrieved.dto-output';

export class MonitoringRecordsRetrievedDtoOutput {
    @ApiProperty({
        required: true,
        type: Number,
        description: 'The total number of all monitoring records.',
    })
    public totalCount!: number;

    @ApiProperty({
        required: true,
        type: [MonitoringRecordRetrievedDtoOutput],
        description: 'The monitoring records retrieved.',
    })
    public monitoringRecords!: MonitoringRecordRetrievedDtoOutput[];
}
