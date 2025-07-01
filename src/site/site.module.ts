import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommandHandlers } from './commands/handlers';
import { SiteController } from './controllers/site.controller';
import { QueryHandlers } from './queries/handlers';
import { SiteEntity } from './repositories/entities';
import { SiteRepositoryService } from './repositories/services/site-repository.service';

@Module({
    imports: [TypeOrmModule.forFeature([SiteEntity])],
    controllers: [SiteController],
    providers: [...QueryHandlers, ...CommandHandlers, SiteRepositoryService],
})
export class SiteModule {}
