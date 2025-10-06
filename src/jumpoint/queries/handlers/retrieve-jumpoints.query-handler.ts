import { HttpService } from '@nestjs/axios';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { AxiosHeaders } from 'axios';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { TENANT_ID_HEADER, TRANSACTION_ID_HEADER } from '../../../core/decorators';
import { ErrorProcessorUtility, ObjectUtility, UrlUtility } from '../../../shared/utilities';
import { Jumpoint } from '../../models';
import { RetrieveJumpointsQuery } from '../retrieve-jumpoints.query';

@QueryHandler(RetrieveJumpointsQuery)
export class RetrieveJumpointsQueryHandler implements IQueryHandler<RetrieveJumpointsQuery> {
    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly httpService: HttpService,
    ) {}

    public async execute(query: RetrieveJumpointsQuery): Promise<Jumpoint[]> {
        try {
            const url = UrlUtility.join(
                this.appConfigService.praSyncApi.baseUrl,
                this.appConfigService.praSyncApi.jumpoint.path,
            );

            const headers = new AxiosHeaders();
            headers.set(TRANSACTION_ID_HEADER, query.transactionId);
            headers.set(TENANT_ID_HEADER, query.tenantId);

            const response = await firstValueFrom(
                this.httpService.get<Jumpoint[]>(url, {
                    params: ObjectUtility.stripProperties(query, 'transactionId'),
                    headers: headers,
                }),
            );

            return response.data;
        } catch (error) {
            throw ErrorProcessorUtility.composeError(error);
        }
    }
}
