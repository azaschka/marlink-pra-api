import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AppConfigModule } from '../app-config/app-config.module';
import { CommandHandlers } from './commands/handlers';
import { DiscrepancyScannerController } from './controllers/discrepancy-scanner.controller';
import { DiscrepancySyncController } from './controllers/discrepancy-sync.controller';
import { QueryHandlers } from './queries/handlers';

@Module({
    imports: [AppConfigModule, HttpModule],
    controllers: [DiscrepancyScannerController, DiscrepancySyncController],
    providers: [...QueryHandlers, ...CommandHandlers],
})
export class DiscrepancyModule {}
