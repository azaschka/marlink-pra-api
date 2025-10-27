import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { DiscrepancyEntityType } from '../../enums';

export class RetrieveDiscrepanciesDtoInput {
    @ApiProperty({
        required: false,
        type: Number,
        default: 100,
        description: 'The number of items to include in a paginated response.',
    })
    @Type(() => Number)
    @IsInt()
    @IsOptional()
    public pageSize: number = 100;

    @ApiProperty({
        required: false,
        type: Number,
        default: 1,
        description: 'The 1-based index of the desired page.',
    })
    @Type(() => Number)
    @IsInt()
    @IsOptional()
    public pageNumber: number = 1;

    @ApiProperty({
        required: false,
        description: 'Filters results to include only discrepancies for the given entity type.',
        enum: DiscrepancyEntityType,
    })
    @IsEnum(DiscrepancyEntityType)
    @IsOptional()
    public entityType?: DiscrepancyEntityType;

    @ApiProperty({
        required: false,
        type: Number,
        description: 'Filters results to include only discrepancies for the given entity ID.',
    })
    @IsInt()
    @IsOptional()
    public entityId?: number;
}
