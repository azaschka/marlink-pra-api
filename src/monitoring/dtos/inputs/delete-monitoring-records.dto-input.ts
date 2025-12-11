import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional } from 'class-validator';

export class DeleteMonitoringRecordsDtoInput {
    @ApiProperty({
        required: false,
        type: Date,
        description: 'The earliest creation date of the monitoring records to delete.',
    })
    @Type(() => Date)
    @IsOptional()
    public creationDateFrom?: Date;

    @ApiProperty({
        required: false,
        type: Date,
        description: 'The latest creation date of the monitoring records to delete.',
    })
    @Type(() => Date)
    @IsOptional()
    public creationDateTo?: Date;
}
