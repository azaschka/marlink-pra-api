import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AppConfigModule } from '../app-config/app-config.module';
import { CommandHandlers } from './commands/handlers';
import { JumpointController } from './controllers/jumpoint.controller';
import { QueryHandlers } from './queries/handlers';

@Module({
    imports: [AppConfigModule, HttpModule],
    controllers: [JumpointController],
    providers: [...QueryHandlers, ...CommandHandlers],
})
export class JumpointModule {}
