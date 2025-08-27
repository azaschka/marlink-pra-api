import { AssetLicenseUsageSourceData } from './asset-license-usage-source-data.model';
import { UserLicenseUsageSourceData } from './user-license-usage-source-data.model';

export interface LicenseUsage {
    totalLicenseUsage: number;
    licenseUsageSourceData: AssetLicenseUsageSourceData[] | UserLicenseUsageSourceData[];
}
