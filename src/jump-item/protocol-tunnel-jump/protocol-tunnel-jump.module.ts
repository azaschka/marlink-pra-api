import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AppConfigModule } from '../../app-config/app-config.module';
import { CommandHandlers } from './commands/handlers';
import { ProtocolTunnelJumpController } from './controllers/protocol-tunnel-jump.controller';
import { QueryHandlers } from './queries/handlers';

@Module({
    imports: [AppConfigModule, HttpModule],
    controllers: [ProtocolTunnelJumpController],
    providers: [...QueryHandlers, ...CommandHandlers],
})
export class ProtocolTunnelJumpModule {}
