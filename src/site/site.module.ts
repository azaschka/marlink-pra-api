import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessGuard } from '../access/guards';
import { AppConfigModule } from '../app-config/app-config.module';
import { CustomersScopeInterceptor } from '../customer/interceptors';
import { CommandHandlers } from './commands/handlers';
import { SiteAuditorController } from './controllers/site-auditor.controller';
import { SiteJumpointController } from './controllers/site-jumpoint.controller';
import { SiteManagerController } from './controllers/site-manager.controller';
import { SiteSupportTeamMemberController } from './controllers/site-support-team-member.controller';
import { SiteController } from './controllers/site.controller';
import { SiteRequestPipe } from './pipes';
import { QueryHandlers } from './queries/handlers';
import {
    SiteAuditorEntity,
    SiteApproverEntity,
    SiteEntity,
    SiteManagerEntity,
    SiteSupportTeamMemberEntity,
} from './repositories/entities';
import { SiteAuditorRepositoryService } from './repositories/services/site-auditor.service';
import { SiteApproverRepositoryService } from './repositories/services/site-approver.service';
import { SiteManagerRepositoryService } from './repositories/services/site-manager.service';
import { SiteRepositoryService } from './repositories/services/site-repository.service';
import { SiteSupportTeamMemberRepositoryService } from './repositories/services/site-support-team-member.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            SiteEntity,
            SiteManagerEntity,
            SiteAuditorEntity,
            SiteSupportTeamMemberEntity,
            SiteApproverEntity,
        ]),
        AppConfigModule,
    ],
    controllers: [
        SiteController,
        SiteAuditorController,
        SiteManagerController,
        SiteSupportTeamMemberController,
        SiteJumpointController,
    ],
    providers: [
        AccessGuard,
        CustomersScopeInterceptor,
        SiteRequestPipe,
        ...QueryHandlers,
        ...CommandHandlers,
        SiteRepositoryService,
        SiteAuditorRepositoryService,
        SiteManagerRepositoryService,
        SiteSupportTeamMemberRepositoryService,
        SiteApproverRepositoryService,
    ],
})
export class SiteModule {}
