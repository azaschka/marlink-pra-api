import { Module } from '@nestjs/common';
import { CommandHandlers } from './commands/handlers';
import { LicenseUsageController } from './controllers/license-usage.controller';

@Module({
    controllers: [LicenseUsageController],
    providers: [...CommandHandlers],
})
export class LicenseUsageModule {}
