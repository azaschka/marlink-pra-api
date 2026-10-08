import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AppConfigService } from '../../app-config/services/app-config.service';

/**
 * Gives every outbound HTTP call of PRA API a default timeout (PRA_SYNC_API_TIMEOUT_IN_MS, 300 s). Before, calls to
 * the Sync API had none (axios default 0), so a Sync API that accepted a connection and never answered kept the
 * request, its socket and the caller waiting forever.
 *
 * The feature modules import the plain HttpModule, whose HttpService uses the shared axios default instance.
 * Setting the default on that instance during module initialisation, before the application serves requests,
 * bounds all of them without changing each call site. Calls that legitimately take longer pass their own
 * `timeout` (AppConfigService.praSyncApiTimeouts). A module that registers its own axios instance
 * (HttpModule.register) is not affected and has to set its own timeout.
 *
 * The timeout limits the time until the response headers arrive; with the default transport (follow-redirects)
 * a socket that is idle for the same time afterwards is destroyed as well. For an ordinary call it is therefore
 * the longest time without an answer. Streamed download bodies get an explicit idle bound of their own
 * (SyncApiDownloadUtility).
 */
@Injectable()
export class OutboundHttpDefaultsService implements OnModuleInit {
    private readonly logger = new Logger('OutboundHttp');

    constructor(
        private readonly httpService: HttpService,
        private readonly appConfigService: AppConfigService,
    ) {}

    public onModuleInit(): void {
        const timeouts = this.appConfigService.praSyncApiTimeouts;
        this.httpService.axiosRef.defaults.timeout = timeouts.defaultInMs;

        this.logger.log(
            `Outbound HTTP timeouts: default ${timeouts.defaultInMs} ms, scan ${timeouts.scanInMs} ms, file transfer ${timeouts.fileTransferInMs} ms, download idle ${timeouts.downloadIdleInMs} ms`,
        );
    }
}
