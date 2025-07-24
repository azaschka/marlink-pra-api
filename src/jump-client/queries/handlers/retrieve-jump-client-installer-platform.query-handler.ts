import { HttpService } from '@nestjs/axios';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { AxiosHeaders, AxiosResponse } from 'axios';
import { catchError, firstValueFrom } from 'rxjs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { TRANSACTION_ID_HEADER } from '../../../core/decorators';
import { ErrorProcessorUtility, ObjectUtility, UrlUtility } from '../../../shared/utilities';
import { RetrieveJumpClientInstallerPlatformQuery } from '../retrieve-jump-client-installer-platform.query';

@QueryHandler(RetrieveJumpClientInstallerPlatformQuery)
export class RetrieveJumpClientInstallerPlatformQueryHandler
    implements IQueryHandler<RetrieveJumpClientInstallerPlatformQuery>
{
    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly httpService: HttpService,
    ) {}

    public async execute(
        query: RetrieveJumpClientInstallerPlatformQuery,
    ): Promise<AxiosResponse<NodeJS.ReadableStream>> {
        try {
            const url = UrlUtility.join(
                this.appConfigService.praSyncApi.baseUrl,
                this.appConfigService.praSyncApi.jumpClient.path,
                this.appConfigService.praSyncApi.jumpClient.installer.path,
                query.installerId,
                this.appConfigService.praSyncApi.jumpClient.installer.platform.path,
                query.platformType,
            );

            const headers = new AxiosHeaders();
            headers.set(TRANSACTION_ID_HEADER, query.transactionId);

            return firstValueFrom(
                this.httpService
                    .get<NodeJS.ReadableStream>(url, {
                        params: ObjectUtility.stripProperties(query, 'transactionId'),
                        headers,
                        responseType: 'stream',
                    })
                    .pipe(
                        catchError((error) => {
                            throw ErrorProcessorUtility.composeError(error);
                        }),
                    ),
            );
        } catch (error) {
            throw ErrorProcessorUtility.composeError(error);
        }
    }
}
