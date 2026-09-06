import { Module } from '@nestjs/common';
import { AppConfigModule } from '../app-config/app-config.module';
import { LogModule } from '../log/log.module';
import { MaintenanceController } from './controllers/maintenance.controller';
import { ResetAuthorizationGuard } from './guards';
import { DatabaseResetService } from './services/database-reset.service';

@Module({
    imports: [AppConfigModule, LogModule],
    controllers: [MaintenanceController],
    providers: [DatabaseResetService, ResetAuthorizationGuard],
})
export class MaintenanceModule {}
