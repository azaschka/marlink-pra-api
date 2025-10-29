import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigModule } from '../app-config/app-config.module';
import { CommandHandlers } from './commands/handlers';
import { AccessController } from './controllers/access.controller';
import { QueryHandlers } from './queries/handlers';
import { AccessEntity } from './repositories/entities';
import { AccessRepositoryService } from './repositories/services/access-repository.service';

@Module({
    imports: [TypeOrmModule.forFeature([AccessEntity]), AppConfigModule, HttpModule],
    controllers: [AccessController],
    providers: [...QueryHandlers, ...CommandHandlers, AccessRepositoryService],
})
export class AccessModule {}
