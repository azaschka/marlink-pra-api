import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AccessGuard } from '../../access/guards';
import { AppConfigModule } from '../../app-config/app-config.module';
import { CustomersScopeInterceptor } from '../../customer/interceptors';
import { CommandHandlers } from './commands/handlers';
import { ShellJumpController } from './controllers/shell-jump.controller';
import { ShellJumpRequestPipe } from './pipes';
import { QueryHandlers } from './queries/handlers';

@Module({
    imports: [AppConfigModule, HttpModule],
    controllers: [ShellJumpController],
    providers: [AccessGuard, CustomersScopeInterceptor, ShellJumpRequestPipe, ...QueryHandlers, ...CommandHandlers],
})
export class ShellJumpModule {}
