import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BillingType, BusinessUnit } from '../../enums';

export class ModifyBeyondtrustInstanceDtoInput {
    @ApiProperty({ required: false, type: String, description: 'The display name of the BeyondTrust instance.' })
    @IsOptional()
    @IsString()
    public name?: string;

    @ApiProperty({
        required: false,
        type: String,
        description: 'The client id to be authenticated by BeyondTrust system.',
    })
    @IsOptional()
    @IsString()
    public authClientId?: string;

    @ApiProperty({
        required: false,
        type: String,
        description: 'The client secret to be authenticated by BeyondTrust system.',
    })
    @IsOptional()
    @IsString()
    public authClientSecret?: string;

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
        enum: BillingType,
        description: 'Billing type of the BeyondTrust instance.',
    })
    @IsEnum(BillingType)
    @IsOptional()
    public billingType?: BillingType;

    @ApiProperty({
        required: false,
        enum: BusinessUnit,
        description: 'Business unit of the BeyondTrust instance.',
    })
    @IsEnum(BusinessUnit)
    @IsOptional()
    public businessUnit?: BusinessUnit;
}
