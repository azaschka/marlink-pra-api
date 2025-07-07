import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AppConfigModule } from '../app-config/app-config.module';
import { CommandHandlers } from './commands/handlers';
import { GroupPolicyMemberController } from './controllers/group-policy-member.controller';
import { QueryHandlers } from './queries/handlers';

@Module({
    imports: [AppConfigModule, HttpModule],
    controllers: [GroupPolicyMemberController],
    providers: [...QueryHandlers, ...CommandHandlers],
})
export class GroupPolicyMemberModule {}
