import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AppConfigModule } from '../../app-config/app-config.module';
import { CommandHandlers } from './commands/handlers';
import { RemoteRdpController } from './controllers/remote-rdp.controller';
import { QueryHandlers } from './queries/handlers';

@Module({
    imports: [AppConfigModule, HttpModule],
    controllers: [RemoteRdpController],
    providers: [...QueryHandlers, ...CommandHandlers],
})
export class RemoteRdpModule {}
