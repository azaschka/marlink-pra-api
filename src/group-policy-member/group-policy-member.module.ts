import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AccessGuard } from '../access/guards';
import { AppConfigModule } from '../app-config/app-config.module';
import { CustomersScopeInterceptor } from '../customer/interceptors';
import { CommandHandlers } from './commands/handlers';
import { GroupPolicyMemberController } from './controllers/group-policy-member.controller';
import { QueryHandlers } from './queries/handlers';

@Module({
    imports: [AppConfigModule, HttpModule],
    controllers: [GroupPolicyMemberController],
    providers: [AccessGuard, CustomersScopeInterceptor, ...QueryHandlers, ...CommandHandlers],
})
export class GroupPolicyMemberModule {}
