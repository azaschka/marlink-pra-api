import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { BusinessUnit } from '../../enums';

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

    @ApiProperty({
        required: false,
        isArray: true,
        enum: BusinessUnit,
        description: 'Filter beyondtrust instances by business units.',
    })
    @IsOptional()
    @IsEnum(BusinessUnit, { each: true })
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
    public businessUnits?: BusinessUnit[];
}
