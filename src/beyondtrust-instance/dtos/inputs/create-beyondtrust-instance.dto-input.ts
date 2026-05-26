import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';
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
        required: false,
        nullable: true,
        enum: BusinessUnit,
        description:
            'Business unit of the BeyondTrust instance. Omit or set to null for shared instances visible to all BUs.',
    })
    @IsEnum(BusinessUnit)
    @IsOptional()
    public businessUnit?: BusinessUnit | null;

    @ApiProperty({
        required: true,
        type: String,
        description:
            'The CNAME (full HTTPS URL) displayed to end-users as the BT console login URL in activation emails.',
    })
    @IsNotEmpty()
    // eslint-disable-next-line @typescript-eslint/naming-convention
    @IsUrl({ require_protocol: true, protocols: ['https'] })
    public cname!: string;
}
