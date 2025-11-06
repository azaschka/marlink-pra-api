import { BillingType } from '../../beyondtrust-instance/enums';
import { LicenseUsage } from './license-usage.model';

export interface CustomerLicenseUsage extends LicenseUsage {
    customerId: number;
    billingType: BillingType;
}
