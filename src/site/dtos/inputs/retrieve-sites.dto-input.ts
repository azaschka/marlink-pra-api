import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class RetrieveSitesDtoInput {
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
        description: 'The unique key of the site to retrieve.',
    })
    @IsOptional()
    @IsString()
    public key?: string;

    @ApiProperty({
        required: false,
        type: String,
        description: 'The name of the site to retrieve.',
    })
    @IsOptional()
    @IsString()
    public name?: string;

    @ApiProperty({
        required: false,
        type: String,
        description: 'The key of the customer to which this site belongs.',
    })
    @IsOptional()
    @IsString()
    public customerKey?: string;
}
