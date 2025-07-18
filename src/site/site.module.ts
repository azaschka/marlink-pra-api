import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigModule } from '../app-config/app-config.module';
import { CommandHandlers } from './commands/handlers';
import { SiteController } from './controllers/site.controller';
import { QueryHandlers } from './queries/handlers';
import {
    SiteAdministratorEntity,
    SiteEntity,
    SiteManagerEntity,
    SiteSupportTeamMemberEntity,
} from './repositories/entities';
import { SiteAdministratorRepositoryService } from './repositories/services/site-administrator.service';
import { SiteManagerRepositoryService } from './repositories/services/site-manager.service';
import { SiteRepositoryService } from './repositories/services/site-repository.service';
import { SiteSupportTeamMemberRepositoryService } from './repositories/services/site-support-team-member.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([SiteEntity, SiteManagerEntity, SiteAdministratorEntity, SiteSupportTeamMemberEntity]),
        AppConfigModule,
    ],
    controllers: [SiteController],
    providers: [
        ...QueryHandlers,
        ...CommandHandlers,
        SiteRepositoryService,
        SiteAdministratorRepositoryService,
        SiteManagerRepositoryService,
        SiteSupportTeamMemberRepositoryService,
    ],
})
export class SiteModule {}
