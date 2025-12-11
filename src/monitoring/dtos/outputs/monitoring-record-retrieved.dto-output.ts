import { ApiProperty } from '@nestjs/swagger';
import { MonitoringRecord } from '../../models';

export class MonitoringRecordRetrievedDtoOutput implements MonitoringRecord {
    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier assigned to this monitoring record by the appliance.',
    })
    public id!: number;

    @ApiProperty({
        required: true,
        type: String,
        description: 'The endpoint path that was monitored.',
    })
    public endpointPath!: string;

    @ApiProperty({
        required: true,
        type: Date,
        description: 'The date and time when this monitoring record was created.',
    })
    public creationDate!: Date;
}
