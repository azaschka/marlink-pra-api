import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AppConfigModule } from '../app-config/app-config.module';
import { OutboundHttpDefaultsService } from './services/outbound-http-defaults.service';

/** Applies the default outbound HTTP timeout to the shared HttpModule instance at bootstrap. */
@Module({
    imports: [AppConfigModule, HttpModule],
    providers: [OutboundHttpDefaultsService],
})
export class OutboundHttpModule {}
