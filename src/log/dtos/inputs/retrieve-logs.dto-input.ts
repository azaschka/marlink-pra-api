import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';
import { SortOrderType } from '../../../shared/enums';

export class RetrieveLogsDtoInput {
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
        type: String,
        description: 'A search string to filter logs by service name, action name, or transaction ID.',
    })
    @IsOptional()
    public searchString?: string;

    @ApiProperty({
        required: false,
        type: Date,
        description: 'The earliest creation date of the logs to retrieve.',
    })
    @Type(() => Date)
    @IsOptional()
    public creationDateFrom?: Date;

    @ApiProperty({
        required: false,
        type: Date,
        description: 'The latest creation date of the logs to retrieve.',
    })
    @Type(() => Date)
    @IsOptional()
    public creationDateTo?: Date;

    @ApiProperty({
        required: false,
        enum: SortOrderType,
        default: SortOrderType.Descending,
        description: 'The order in which to sort the logs.',
    })
    public sortOrderType?: SortOrderType = SortOrderType.Descending;

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
