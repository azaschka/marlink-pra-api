import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { CqrsModule } from '@nestjs/cqrs';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessModule } from './access/access.module';
import { AppConfigModule } from './app-config/app-config.module';
import { AppConfigService } from './app-config/services/app-config.service';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { BeyondtrustInstanceBackupModule } from './beyondtrust-instance-backup/beyondtrust-instance-backup.module';
import { BeyondtrustInstanceModule } from './beyondtrust-instance/beyondtrust-instance.module';
import { CustomerModule } from './customer/customer.module';
import { DeploymentModule } from './deployment/deployment.module';
import { DiscrepancyModule } from './discrepancy/discrepancy.module';
import { EmailModule } from './email/email.module';
import { GroupPolicyJumpGroupModule } from './group-policy-jump-group/group-policy-jump-group.module';
import { GroupPolicyJumpointModule } from './group-policy-jumpoint/group-policy-jumpoint.module';
import { GroupPolicyMemberModule } from './group-policy-member/group-policy-member.module';
import { GroupPolicyTeamModule } from './group-policy-team/group-policy-team.module';
import { GroupPolicyModule } from './group-policy/group-policy.module';
import { HealthModule } from './health/health.module';
import { JobModule } from './job/job.module';
import { JumpClientModule } from './jump-client/jump-client.module';
import { JumpGroupModule } from './jump-group/jump-group.module';
import { JumpItemModule } from './jump-item/jump-item.module';
import { JumpPolicyModule } from './jump-policy/jump-policy.module';
import { JumpointModule } from './jumpoint/jumpoint.module';
import { LicenseUsageModule } from './license-usage/license-usage.module';
import { LogModule } from './log/log.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { MigrationModule } from './migration/migration.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { SessionPolicyModule } from './session-policy/session-policy.module';
import { SiteModule } from './site/site.module';
import { SocModule } from './soc/soc.module';
import { TeamUserModule } from './team-user/team-user.module';
import { TeamModule } from './team/team.module';
import { UserGroupPolicyModule } from './user-group-policy/user-group-policy.module';
import { UserModule } from './user/user.module';

@Module({
    imports: [
        TypeOrmModule.forRootAsync({
            imports: [AppConfigModule],
            useFactory: (config: AppConfigService) => config.database,
            inject: [AppConfigService],
        }),
        CqrsModule.forRoot(),
        ThrottlerModule.forRootAsync({
            imports: [AppConfigModule],
            useFactory: (config: AppConfigService) => [
                {
                    ttl: config.throttle.ttlInMs,
                    limit: config.throttle.limit,
                    skipIf: () => !config.throttle.isEnabled,
                },
            ],
            inject: [AppConfigService],
        }),
        HttpModule,
        MigrationModule, // Must be loaded early to run migrations before other modules
        AuthModule,
        HealthModule,
        AccessModule,
        LicenseUsageModule,
        CustomerModule,
        SiteModule,
        BeyondtrustInstanceModule,
        BeyondtrustInstanceBackupModule,
        UserModule,
        UserGroupPolicyModule,
        TeamModule,
        JumpClientModule,
        TeamUserModule,
        GroupPolicyModule,
        GroupPolicyJumpointModule,
        GroupPolicyJumpGroupModule,
        GroupPolicyMemberModule,
        GroupPolicyTeamModule,
        JumpointModule,
        JumpGroupModule,
        JumpPolicyModule,
        JumpItemModule,
        SessionPolicyModule,
        SocModule,
        DiscrepancyModule,
        EmailModule,
        JobModule,
        LogModule,
        MonitoringModule,
        DeploymentModule,
        MaintenanceModule,
    ],
    controllers: [AppController],
    providers: [
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard, // global rate limiting
        },
    ],
})
export class AppModule {}
