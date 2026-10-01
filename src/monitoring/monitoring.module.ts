import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigModule } from '../app-config/app-config.module';
import { CommandHandlers } from './commands/handlers';
import { MonitoringController } from './controllers/monitoring.controller';
import { MonitoringRequestPipe } from './pipes';
import { QueryHandlers } from './queries/handlers';
import { MonitoringRecordEntity } from './repositories/entities';
import { MonitoringRecordRepositoryService } from './repositories/services/monitoring-record-repository.service';
import { MonitoringRecordWriterService } from './services';

@Module({
    imports: [TypeOrmModule.forFeature([MonitoringRecordEntity]), AppConfigModule],
    controllers: [MonitoringController],
    providers: [
        MonitoringRequestPipe,
        ...QueryHandlers,
        ...CommandHandlers,
        MonitoringRecordRepositoryService,
        MonitoringRecordWriterService,
    ],
    exports: [MonitoringRecordWriterService],
})
export class MonitoringModule {}
