import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AccessGuard } from '../access/guards';
import { AppConfigModule } from '../app-config/app-config.module';
import { CustomersScopeInterceptor } from '../customer/interceptors';
import { CommandHandlers } from './commands/handlers';
import { TeamUserController } from './controllers/team-user.controller';
import { QueryHandlers } from './queries/handlers';

@Module({
    imports: [AppConfigModule, HttpModule],
    controllers: [TeamUserController],
    providers: [AccessGuard, CustomersScopeInterceptor, ...QueryHandlers, ...CommandHandlers],
})
export class TeamUserModule {}
