import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AppConfigModule } from '../../app-config/app-config.module';
import { CommandHandlers } from './commands/handlers';
import { ShellJumpController } from './controllers/shell-jump.controller';
import { QueryHandlers } from './queries/handlers';

@Module({
    imports: [AppConfigModule, HttpModule],
    controllers: [ShellJumpController],
    providers: [...QueryHandlers, ...CommandHandlers],
})
export class ShellJumpModule {}
