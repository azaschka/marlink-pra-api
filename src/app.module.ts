import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigModule } from './app-config/app-config.module';
import { AppConfigService } from './app-config/services/app-config.service';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { BeyondtrustInstanceBackupModule } from './beyondtrust-instance-backup/beyondtrust-instance-backup.module';
import { BeyondtrustInstanceModule } from './beyondtrust-instance/beyondtrust-instance.module';
import { CustomerModule } from './customer/customer.module';
import { EmailModule } from './email/email.module';
import { GroupPolicyJumpGroupModule } from './group-policy-jump-group/group-policy-jump-group.module';
import { GroupPolicyJumpointModule } from './group-policy-jumpoint/group-policy-jumpoint.module';
import { GroupPolicyMemberModule } from './group-policy-member/group-policy-member.module';
import { GroupPolicyTeamModule } from './group-policy-team/group-policy-team.module';
import { GroupPolicyModule } from './group-policy/group-policy.module';
import { HealthModule } from './health/health.module';
import { JumpClientModule } from './jump-client/jump-client.module';
import { JumpGroupModule } from './jump-group/jump-group.module';
import { JumpItemModule } from './jump-item/jump-item.module';
import { JumpPolicyModule } from './jump-policy/jump-policy.module';
import { JumpointModule } from './jumpoint/jumpoint.module';
import { LicenseUsageModule } from './license-usage/license-usage.module';
import { LogModule } from './log/log.module';
import { SiteModule } from './site/site.module';
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
        HttpModule,
        AuthModule,
        HealthModule,
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
        LogModule,
        EmailModule,
    ],
    controllers: [AppController],
})
export class AppModule {}
