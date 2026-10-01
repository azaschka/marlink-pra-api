import { HttpService } from '@nestjs/axios';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { AxiosHeaders, AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { TENANT_ID_HEADER, TRANSACTION_ID_HEADER } from '../../../core/decorators';
import { ErrorProcessorUtility, ObjectUtility, SyncApiDownloadUtility, UrlUtility } from '../../../shared/utilities';
import { RetrieveJumpointInstallerQuery } from '../retrieve-jumpoint-installer.query';

@QueryHandler(RetrieveJumpointInstallerQuery)
export class RetrieveJumpointInstallerQueryHandler implements IQueryHandler<RetrieveJumpointInstallerQuery> {
    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly httpService: HttpService,
    ) {}

    public async execute(query: RetrieveJumpointInstallerQuery): Promise<AxiosResponse<NodeJS.ReadableStream>> {
        try {
            const url = UrlUtility.join(
                this.appConfigService.praSyncApi.baseUrl,
                this.appConfigService.praSyncApi.jumpoint.path,
                query.jumpointId.toString(),
                this.appConfigService.praSyncApi.jumpoint.installer.path,
            );

            const headers = new AxiosHeaders();
            headers.set(TRANSACTION_ID_HEADER, query.transactionId);
            headers.set(TENANT_ID_HEADER, query.tenantId);

            const response = await firstValueFrom(
                this.httpService.get<NodeJS.ReadableStream>(url, {
                    params: ObjectUtility.stripProperties(query, 'transactionId', 'jumpointId'),
                    headers,
                    responseType: 'stream',
                }),
            );

            return SyncApiDownloadUtility.withIdleTimeout(
                response,
                this.appConfigService.praSyncApiTimeouts.downloadIdleInMs,
                `jumpoint installer ${query.jumpointId}`,
            );
        } catch (error) {
            throw ErrorProcessorUtility.composeError(error);
        }
    }
}
