import { BillingType } from '../../beyondtrust-instance/enums';
import { LicenseUsage } from './license-usage.model';

export interface SiteLicenseUsage extends LicenseUsage {
    siteId: number;
    customerId: number;
    billingType: BillingType;
}
