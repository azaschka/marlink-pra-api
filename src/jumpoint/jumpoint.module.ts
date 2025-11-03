import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AccessGuard } from '../access/guards';
import { AppConfigModule } from '../app-config/app-config.module';
import { CustomersScopeInterceptor } from '../customer/interceptors';
import { CommandHandlers } from './commands/handlers';
import { JumpointExtensionController } from './controllers/jumpoint-extension.controller';
import { JumpointController } from './controllers/jumpoint.controller';
import { JumpointRequestPipe } from './pipes';
import { QueryHandlers } from './queries/handlers';

@Module({
    imports: [AppConfigModule, HttpModule],
    controllers: [JumpointExtensionController, JumpointController], // // Extension should be first since it's more specific and routes could overlap
    providers: [AccessGuard, CustomersScopeInterceptor, JumpointRequestPipe, ...QueryHandlers, ...CommandHandlers],
})
export class JumpointModule {}
