import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';
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
        nullable: true,
        enum: BusinessUnit,
        description: 'Business unit of the BeyondTrust instance. Set to null to make shared.',
    })
    @IsEnum(BusinessUnit)
    @IsOptional()
    public businessUnit?: BusinessUnit | null;

    @ApiProperty({
        required: false,
        type: String,
        description:
            'The CNAME (full HTTPS URL) displayed to end-users as the BT console login URL in activation emails.',
    })
    @IsOptional()
    // eslint-disable-next-line @typescript-eslint/naming-convention
    @IsUrl({ require_protocol: true, protocols: ['https'] })
    public cname?: string;
}
