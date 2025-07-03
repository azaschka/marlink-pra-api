import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class RetrieveUsersDtoInput {
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
        type: Number,
        description: 'Filters results to include only users with the given security provider ID.',
    })
    @Type(() => Number)
    @IsInt()
    @IsOptional()
    public securityProviderId?: number;

    @ApiProperty({
        required: false,
        type: String,
        description: 'Filters results to include only users with the given username.',
    })
    @IsString()
    @IsOptional()
    public username?: string;

    @ApiProperty({
        required: false,
        type: String,
        description: 'Filters results to include only users with the given email address.',
    })
    @IsString()
    @IsOptional()
    public email?: string;
}
