import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AccessGuard } from '../access/guards';
import { AppConfigModule } from '../app-config/app-config.module';
import { CustomersScopeInterceptor } from '../customer/interceptors';
import { CommandHandlers } from './commands/handlers';
import { SessionPolicyController } from './controllers/session-policy.controller';
import { SessionPolicyRequestPipe } from './pipes';
import { QueryHandlers } from './queries/handlers';

@Module({
    imports: [AppConfigModule, HttpModule],
    controllers: [SessionPolicyController],
    providers: [AccessGuard, CustomersScopeInterceptor, SessionPolicyRequestPipe, ...QueryHandlers, ...CommandHandlers],
})
export class SessionPolicyModule {}
