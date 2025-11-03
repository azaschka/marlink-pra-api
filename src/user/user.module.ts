import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AccessGuard } from '../access/guards';
import { AppConfigModule } from '../app-config/app-config.module';
import { CustomersScopeInterceptor } from '../customer/interceptors';
import { CommandHandlers } from './commands/handlers';
import { UserController } from './controllers/user.controller';
import { UserRequestPipe } from './pipes';
import { QueryHandlers } from './queries/handlers';

@Module({
    imports: [AppConfigModule, HttpModule],
    controllers: [UserController],
    providers: [AccessGuard, CustomersScopeInterceptor, UserRequestPipe, ...QueryHandlers, ...CommandHandlers],
})
export class UserModule {}
