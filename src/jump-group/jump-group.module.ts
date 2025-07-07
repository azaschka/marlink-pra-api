import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AppConfigModule } from '../app-config/app-config.module';
import { CommandHandlers } from './commands/handlers';
import { JumpGroupController } from './controllers/jump-group.controller';
import { QueryHandlers } from './queries/handlers';

@Module({
    imports: [AppConfigModule, HttpModule],
    controllers: [JumpGroupController],
    providers: [...QueryHandlers, ...CommandHandlers],
})
export class JumpGroupModule {}
