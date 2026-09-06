import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigModule } from '../app-config/app-config.module';
import { CommandHandlers } from './commands/handlers';
import { LogController } from './controllers/log.controller';
import { LogEntity } from './repositories/entities';
import { LogRepositoryService } from './repositories/services/log-repository.service';
import { LogFilterService } from './services/log-filter.service';
import { LogService } from './services/log.service';

@Module({
    imports: [TypeOrmModule.forFeature([LogEntity]), AppConfigModule],
    controllers: [LogController],
    providers: [LogRepositoryService, LogService, LogFilterService, ...CommandHandlers],
    exports: [LogService],
})
export class LogModule {}
