import { HttpService } from '@nestjs/axios';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { AxiosHeaders, AxiosResponse } from 'axios';
import { catchError, firstValueFrom } from 'rxjs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { TRANSACTION_ID_HEADER } from '../../../core/decorators';
import { ErrorProcessorUtility, ObjectUtility, UrlUtility } from '../../../shared/utilities';
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

            return firstValueFrom(
                this.httpService
                    .get<NodeJS.ReadableStream>(url, {
                        params: ObjectUtility.stripProperties(query, 'transactionId', 'jumpointId'),
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
