import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AccessGuard } from '../access/guards';
import { AppConfigModule } from '../app-config/app-config.module';
import { CustomersScopeInterceptor } from '../customer/interceptors';
import { CommandHandlers } from './commands/handlers';
import { JumpClientInstallerController } from './controllers/jump-client-installer.controller';
import { JumpClientController } from './controllers/jump-client.controller';
import { JumpClientInstallerRequestPipe, JumpClientRequestPipe } from './pipes';
import { QueryHandlers } from './queries/handlers';

@Module({
    imports: [AppConfigModule, HttpModule],
    controllers: [JumpClientInstallerController, JumpClientController], // Installer should be first since it's more specific and routes could overlap
    providers: [
        AccessGuard,
        CustomersScopeInterceptor,
        JumpClientRequestPipe,
        JumpClientInstallerRequestPipe,
        ...QueryHandlers,
        ...CommandHandlers,
    ],
})
export class JumpClientModule {}
