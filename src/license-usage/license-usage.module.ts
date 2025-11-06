import { Module } from '@nestjs/common';
import { AccessGuard } from '../access/guards';
import { CustomersScopeInterceptor } from '../customer/interceptors';
import { CommandHandlers } from './commands/handlers';
import { CustomerLicenseUsageController } from './controllers/customer-license-usage.controller';
import { SiteLicenseUsageController } from './controllers/site-license-usage.controller';
import { CustomerLicenseUsageRequestPipe, SiteLicenseUsageRequestPipe } from './pipes';

@Module({
    controllers: [SiteLicenseUsageController, CustomerLicenseUsageController],
    providers: [
        AccessGuard,
        CustomersScopeInterceptor,
        SiteLicenseUsageRequestPipe,
        CustomerLicenseUsageRequestPipe,
        ...CommandHandlers,
    ],
})
export class LicenseUsageModule {}
