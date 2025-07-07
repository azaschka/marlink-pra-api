import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class RetrieveBeyondtrustInstancesDtoInput {
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

    @ApiProperty({ required: false, type: String, description: 'The display name of the BeyondTrust instance.' })
    @IsString()
    @IsOptional()
    public name?: string;

    @ApiProperty({
        required: false,
        type: String,
        description: 'The url to retrieve BeyondTrust OAuth2 token.',
    })
    @IsOptional()
    @IsString()
    public oauth2TokenUrl?: string;

    @ApiProperty({
        required: false,
        type: String,
        description: 'The base url of the BeyondTrust PRA Configuration API.',
    })
    @IsOptional()
    @IsString()
    public apiBaseUrl?: string;
}
