import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { BillingType } from '../../../customer/enums';
import { SiteLicenseUsage } from '../../models';
import { AssetLicenseUsageSourceDataDtoOutput } from './asset-license-usage-source-data.dto-output';
import { UserLicenseUsageSourceDataDtoOutput } from './user-license-usage-source-data.dto-output';

@ApiExtraModels(UserLicenseUsageSourceDataDtoOutput, AssetLicenseUsageSourceDataDtoOutput)
export class SiteLicenseUsageDtoOutput implements SiteLicenseUsage {
    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier of the site.',
    })
    public siteId!: number;

    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier of the customer.',
    })
    public customerId!: number;

    @ApiProperty({
        required: true,
        enum: BillingType,
        description: 'The billing type of the customer.',
    })
    public billingType!: BillingType;

    @ApiProperty({
        required: true,
        type: Number,
        description: 'The total license usage of the site.',
    })
    public totalLicenseUsage!: number;

    @ApiProperty({
        required: true,
        type: 'array',
        items: {
            oneOf: [
                { $ref: getSchemaPath(UserLicenseUsageSourceDataDtoOutput) },
                { $ref: getSchemaPath(AssetLicenseUsageSourceDataDtoOutput) },
            ],
        },
        description: 'The license usage source data for the site. Billing type determines the type of data.',
    })
    public licenseUsageSourceData!: UserLicenseUsageSourceDataDtoOutput[] | AssetLicenseUsageSourceDataDtoOutput[];
}
