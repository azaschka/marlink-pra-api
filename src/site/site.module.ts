import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigModule } from '../app-config/app-config.module';
import { CommandHandlers } from './commands/handlers';
import { SiteAdministratorController } from './controllers/site-administrator.controller';
import { SiteJumpointController } from './controllers/site-jumpoint.controller';
import { SiteManagerController } from './controllers/site-manager.controller';
import { SiteSupportTeamMemberController } from './controllers/site-support-team-member.controller';
import { SiteController } from './controllers/site.controller';
import { QueryHandlers } from './queries/handlers';
import {
    SiteAdministratorEntity,
    SiteApproverEntity,
    SiteEntity,
    SiteManagerEntity,
    SiteSupportTeamMemberEntity,
} from './repositories/entities';
import { SiteAdministratorRepositoryService } from './repositories/services/site-administrator.service';
import { SiteApproverRepositoryService } from './repositories/services/site-approver.service';
import { SiteManagerRepositoryService } from './repositories/services/site-manager.service';
import { SiteRepositoryService } from './repositories/services/site-repository.service';
import { SiteSupportTeamMemberRepositoryService } from './repositories/services/site-support-team-member.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            SiteEntity,
            SiteManagerEntity,
            SiteAdministratorEntity,
            SiteSupportTeamMemberEntity,
            SiteApproverEntity,
        ]),
        AppConfigModule,
    ],
    controllers: [
        SiteController,
        SiteAdministratorController,
        SiteManagerController,
        SiteSupportTeamMemberController,
        SiteJumpointController,
    ],
    providers: [
        ...QueryHandlers,
        ...CommandHandlers,
        SiteRepositoryService,
        SiteAdministratorRepositoryService,
        SiteManagerRepositoryService,
        SiteSupportTeamMemberRepositoryService,
        SiteApproverRepositoryService,
    ],
})
export class SiteModule {}
