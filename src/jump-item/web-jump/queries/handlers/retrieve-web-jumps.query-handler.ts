import { HttpService } from '@nestjs/axios';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { AxiosHeaders } from 'axios';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../../../../app-config/services/app-config.service';
import { TENANT_ID_HEADER, TRANSACTION_ID_HEADER } from '../../../../core/decorators';
import { ErrorProcessorUtility, ObjectUtility, UrlUtility } from '../../../../shared/utilities';
import { WebJump } from '../../models';
import { RetrieveWebJumpsQuery } from '../retrieve-web-jumps.query';

@QueryHandler(RetrieveWebJumpsQuery)
export class RetrieveWebJumpsQueryHandler implements IQueryHandler<RetrieveWebJumpsQuery> {
    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly httpService: HttpService,
    ) {}

    public async execute(query: RetrieveWebJumpsQuery): Promise<WebJump[]> {
        try {
            const url = UrlUtility.join(
                this.appConfigService.praSyncApi.baseUrl,
                this.appConfigService.praSyncApi.jumpItem.webJump.path,
            );

            const headers = new AxiosHeaders();
            headers.set(TRANSACTION_ID_HEADER, query.transactionId);
            headers.set(TENANT_ID_HEADER, query.tenantId);

            const response = await firstValueFrom(
                this.httpService.get<WebJump[]>(url, {
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
