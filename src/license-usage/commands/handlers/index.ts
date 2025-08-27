import { CalculateAssetLicenseUsageCommandHandler } from './calculate-asset-license-usage.command-handler';
import { CalculateCustomerLicenseUsageCommandHandler } from './calculate-customer-license-usage.command-handler';
import { CalculateSiteLicenseUsageCommandHandler } from './calculate-site-license-usage.command-handler';
import { CalculateUserLicenseUsageCommandHandler } from './calculate-user-license-usage.command-handler';

export const CommandHandlers = [
    CalculateCustomerLicenseUsageCommandHandler,
    CalculateSiteLicenseUsageCommandHandler,
    CalculateAssetLicenseUsageCommandHandler,
    CalculateUserLicenseUsageCommandHandler,
];
