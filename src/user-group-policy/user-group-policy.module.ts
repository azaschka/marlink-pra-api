import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AppConfigModule } from '../app-config/app-config.module';
import { CommandHandlers } from './commands/handlers';
import { UserGroupPolicyController } from './controllers/user-group-policy.controller';
import { QueryHandlers } from './queries/handlers';

@Module({
    imports: [AppConfigModule, HttpModule],
    controllers: [UserGroupPolicyController],
    providers: [...QueryHandlers, ...CommandHandlers],
})
export class UserGroupPolicyModule {}
