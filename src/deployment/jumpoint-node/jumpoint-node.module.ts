import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AppConfigModule } from '../../app-config/app-config.module';
import { CommandHandlers } from './commands/handlers';
import { JumpointNodeController } from './controllers/jumpoint-node.controller';
import { QueryHandlers } from './queries/handlers';

@Module({
    imports: [AppConfigModule, HttpModule],
    controllers: [JumpointNodeController],
    providers: [...QueryHandlers, ...CommandHandlers],
})
export class JumpointNodeModule {}
