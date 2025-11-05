import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

export class DeleteLogsDtoInput {
    @ApiProperty({
        required: false,
        type: Date,
        description: 'The earliest creation date of the logs to delete.',
    })
    @Type(() => Date)
    @IsOptional()
    public creationDateFrom?: Date;

    @ApiProperty({
        required: false,
        type: Date,
        description: 'The latest creation date of the logs to delete.',
    })
    @Type(() => Date)
    @IsOptional()
    public creationDateTo?: Date;

    @ApiProperty({
        required: false,
        type: Number,
        description: 'The tenant ID to filter logs for multi-tenant scenarios.',
    })
    @Type(() => Number)
    @IsInt()
    @IsOptional()
    public tenantId?: number;
}
