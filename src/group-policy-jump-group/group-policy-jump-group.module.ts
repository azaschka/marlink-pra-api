import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AppConfigModule } from '../app-config/app-config.module';
import { CommandHandlers } from './commands/handlers';
import { GroupPolicyJumpGroupController } from './controllers/group-policy-jump-group.controller';
import { QueryHandlers } from './queries/handlers';

@Module({
    imports: [AppConfigModule, HttpModule],
    controllers: [GroupPolicyJumpGroupController],
    providers: [...QueryHandlers, ...CommandHandlers],
})
export class GroupPolicyJumpGroupModule {}
