import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AppConfigModule } from '../app-config/app-config.module';
import { CommandHandlers } from './commands/handlers';
import { DiscrepancyScannerController } from './controllers/discrepancy-scanner.controller';
import { DiscrepancySyncController } from './controllers/discrepancy-sync.controller';
import { QueryHandlers } from './queries/handlers';
import { DiscrepancyScanStatusService } from './services/discrepancy-scan-status.service';

@Module({
    imports: [AppConfigModule, HttpModule],
    controllers: [DiscrepancyScannerController, DiscrepancySyncController],
    providers: [...QueryHandlers, ...CommandHandlers, DiscrepancyScanStatusService],
})
export class DiscrepancyModule {}
