import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AccessGuard } from '../access/guards';
import { AppConfigModule } from '../app-config/app-config.module';
import { CustomersScopeInterceptor } from '../customer/interceptors';
import { CommandHandlers } from './commands/handlers';
import { JumpPolicyController } from './controllers/jump-policy.controller';
import { JumpPolicyRequestPipe } from './pipes';
import { QueryHandlers } from './queries/handlers';

@Module({
    imports: [AppConfigModule, HttpModule],
    controllers: [JumpPolicyController],
    providers: [AccessGuard, CustomersScopeInterceptor, JumpPolicyRequestPipe, ...QueryHandlers, ...CommandHandlers],
})
export class JumpPolicyModule {}
