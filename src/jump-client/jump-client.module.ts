import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AppConfigModule } from '../app-config/app-config.module';
import { CommandHandlers } from './commands/handlers';
import { JumpClientInstallerController } from './controllers/jump-client-installer.controller';
import { JumpClientController } from './controllers/jump-client.controller';
import { QueryHandlers } from './queries/handlers';

@Module({
    imports: [AppConfigModule, HttpModule],
    controllers: [JumpClientInstallerController, JumpClientController], // Installer should be first since it's more specific and routes could overlap
    providers: [...QueryHandlers, ...CommandHandlers],
})
export class JumpClientModule {}
