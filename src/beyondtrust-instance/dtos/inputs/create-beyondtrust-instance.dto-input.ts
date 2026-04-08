import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { BillingType, BusinessUnit } from '../../enums';

export class CreateBeyondtrustInstanceDtoInput {
    @ApiProperty({ required: true, type: String, description: 'The display name of the BeyondTrust instance.' })
    @IsNotEmpty()
    @IsString()
    public name!: string;

    @ApiProperty({
        required: true,
        type: String,
        description: 'The client id to be authenticated by BeyondTrust system.',
    })
    @IsNotEmpty()
    @IsString()
    public authClientId!: string;

    @ApiProperty({
        required: true,
        type: String,
        description: 'The client secret to be authenticated by BeyondTrust system.',
    })
    @IsNotEmpty()
    @IsString()
    public authClientSecret!: string;

    @ApiProperty({
        required: true,
        type: String,
        description: 'The url to retrieve BeyondTrust OAuth2 token.',
    })
    @IsNotEmpty()
    @IsString()
    public oauth2TokenUrl!: string;

    @ApiProperty({
        required: true,
        type: String,
        description: 'The base url of the BeyondTrust PRA Configuration API.',
    })
    @IsNotEmpty()
    @IsString()
    public apiBaseUrl!: string;

    @ApiProperty({
        required: true,
        enum: BillingType,
        description: 'Billing type of the BeyondTrust instance.',
    })
    @IsEnum(BillingType)
    @IsNotEmpty()
    public billingType!: BillingType;

    @ApiProperty({
        required: true,
        enum: BusinessUnit,
        description: 'Business unit of the BeyondTrust instance.',
    })
    @IsEnum(BusinessUnit)
    @IsNotEmpty()
    public businessUnit!: BusinessUnit;
}
