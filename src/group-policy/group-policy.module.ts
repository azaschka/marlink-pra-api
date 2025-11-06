import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AccessGuard } from '../access/guards';
import { AppConfigModule } from '../app-config/app-config.module';
import { CustomersScopeInterceptor } from '../customer/interceptors';
import { CommandHandlers } from './commands/handlers';
import { GroupPolicyController } from './controllers/group-policy.controller';
import { GroupPolicyRequestPipe } from './pipes';
import { QueryHandlers } from './queries/handlers';

@Module({
    imports: [AppConfigModule, HttpModule],
    controllers: [GroupPolicyController],
    providers: [AccessGuard, CustomersScopeInterceptor, GroupPolicyRequestPipe, ...QueryHandlers, ...CommandHandlers],
})
export class GroupPolicyModule {}
