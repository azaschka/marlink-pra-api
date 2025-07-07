import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AppConfigModule } from '../app-config/app-config.module';
import { CommandHandlers } from './commands/handlers';
import { JumpPolicyController } from './controllers/jump-policy.controller';
import { QueryHandlers } from './queries/handlers';

@Module({
    imports: [AppConfigModule, HttpModule],
    controllers: [JumpPolicyController],
    providers: [...QueryHandlers, ...CommandHandlers],
})
export class JumpPolicyModule {}
