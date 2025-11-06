import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AccessGuard } from '../../access/guards';
import { AppConfigModule } from '../../app-config/app-config.module';
import { CustomersScopeInterceptor } from '../../customer/interceptors';
import { CommandHandlers } from './commands/handlers';
import { ProtocolTunnelJumpController } from './controllers/protocol-tunnel-jump.controller';
import { ProtocolTunnelJumpRequestPipe } from './pipes';
import { QueryHandlers } from './queries/handlers';

@Module({
    imports: [AppConfigModule, HttpModule],
    controllers: [ProtocolTunnelJumpController],
    providers: [
        AccessGuard,
        CustomersScopeInterceptor,
        ProtocolTunnelJumpRequestPipe,
        ...QueryHandlers,
        ...CommandHandlers,
    ],
})
export class ProtocolTunnelJumpModule {}
