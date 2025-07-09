import { BillingType } from '../enums';
import { AssetLicenseUsageSourceData } from './asset-license-usage-source-data.model';
import { UserLicenseUsageSourceData } from './user-license-usage-source-data.model';

export interface CustomerLicenseUsage {
    customerId: number;
    billingType: BillingType;
    totalLicenseUsage: number;
    licenseUsageSourceData: AssetLicenseUsageSourceData[] | UserLicenseUsageSourceData[];
}
