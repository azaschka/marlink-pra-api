import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AppConfigModule } from '../../app-config/app-config.module';
import { CommandHandlers } from './commands/handlers';
import { RemoteVncController } from './controllers/remote-vnc.controller';
import { QueryHandlers } from './queries/handlers';

@Module({
    imports: [AppConfigModule, HttpModule],
    controllers: [RemoteVncController],
    providers: [...QueryHandlers, ...CommandHandlers],
})
export class RemoteVncModule {}
