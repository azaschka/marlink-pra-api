import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LogController } from './controllers/log.controller';
import { LogEntity } from './repositories/entities';
import { LogFilterService } from './repositories/services/log-filter.service';
import { LogRepositoryService } from './repositories/services/log-repository.service';
import { LogService } from './repositories/services/log.service';

@Module({
    imports: [TypeOrmModule.forFeature([LogEntity])],
    controllers: [LogController],
    providers: [LogRepositoryService, LogService, LogFilterService],
})
export class LogModule {}
