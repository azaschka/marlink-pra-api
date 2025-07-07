import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AppConfigModule } from '../app-config/app-config.module';
import { CommandHandlers } from './commands/handlers';
import { TeamUserController } from './controllers/team-user.controller';
import { QueryHandlers } from './queries/handlers';

@Module({
    imports: [AppConfigModule, HttpModule],
    controllers: [TeamUserController],
    providers: [...QueryHandlers, ...CommandHandlers],
})
export class TeamUserModule {}
