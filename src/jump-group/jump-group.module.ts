import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AccessGuard } from '../access/guards';
import { AppConfigModule } from '../app-config/app-config.module';
import { CustomersScopeInterceptor } from '../customer/interceptors';
import { CommandHandlers } from './commands/handlers';
import { JumpGroupController } from './controllers/jump-group.controller';
import { JumpGroupRequestPipe } from './pipes';
import { QueryHandlers } from './queries/handlers';

@Module({
    imports: [AppConfigModule, HttpModule],
    controllers: [JumpGroupController],
    providers: [AccessGuard, CustomersScopeInterceptor, JumpGroupRequestPipe, ...QueryHandlers, ...CommandHandlers],
})
export class JumpGroupModule {}
