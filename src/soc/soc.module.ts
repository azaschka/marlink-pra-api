import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AccessGuard } from '../access/guards';
import { AppConfigModule } from '../app-config/app-config.module';
import { CustomersScopeInterceptor } from '../customer/interceptors';
import { SocController } from './controllers/soc.controller';
import { SocRequestPipe } from './pipes';
import { QueryHandlers } from './queries/handlers';

@Module({
    imports: [AppConfigModule, HttpModule],
    controllers: [SocController],
    providers: [AccessGuard, CustomersScopeInterceptor, SocRequestPipe, ...QueryHandlers],
})
export class SocModule {}
