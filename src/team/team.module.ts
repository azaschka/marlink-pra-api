import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AccessGuard } from '../access/guards';
import { AppConfigModule } from '../app-config/app-config.module';
import { CustomersScopeInterceptor } from '../customer/interceptors';
import { CommandHandlers } from './commands/handlers';
import { TeamController } from './controllers/team.controller';
import { TeamRequestPipe } from './pipes';
import { QueryHandlers } from './queries/handlers';

@Module({
    imports: [AppConfigModule, HttpModule],
    controllers: [TeamController],
    providers: [AccessGuard, CustomersScopeInterceptor, TeamRequestPipe, ...QueryHandlers, ...CommandHandlers],
})
export class TeamModule {}
