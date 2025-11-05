import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AccessGuard } from '../../access/guards';
import { AppConfigModule } from '../../app-config/app-config.module';
import { CustomersScopeInterceptor } from '../../customer/interceptors';
import { CommandHandlers } from './commands/handlers';
import { WebJumpController } from './controllers/web-jump.controller';
import { WebJumpRequestPipe } from './pipes';
import { QueryHandlers } from './queries/handlers';

@Module({
    imports: [AppConfigModule, HttpModule],
    controllers: [WebJumpController],
    providers: [AccessGuard, CustomersScopeInterceptor, WebJumpRequestPipe, ...QueryHandlers, ...CommandHandlers],
})
export class WebJumpModule {}
