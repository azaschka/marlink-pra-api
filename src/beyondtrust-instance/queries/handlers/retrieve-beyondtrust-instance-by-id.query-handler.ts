import { HttpService } from '@nestjs/axios';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { AxiosHeaders } from 'axios';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { TRANSACTION_ID_HEADER } from '../../../core/decorators';
import { ErrorProcessorUtility, ObjectUtility, UrlUtility } from '../../../shared/utilities';
import { BeyondtrustInstance } from '../../models';
import { RetrieveBeyondtrustInstanceByIdQuery } from '../retrieve-beyondtrust-instance-by-id.query';

@QueryHandler(RetrieveBeyondtrustInstanceByIdQuery)
export class RetrieveBeyondtrustInstanceByIdQueryHandler implements IQueryHandler<RetrieveBeyondtrustInstanceByIdQuery> {
    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly httpService: HttpService,
    ) {}
    public async execute(query: RetrieveBeyondtrustInstanceByIdQuery): Promise<BeyondtrustInstance> {
        try {
            const url = UrlUtility.join(
                this.appConfigService.praSyncApi.baseUrl,
                this.appConfigService.praSyncApi.beyondtrustInstance.path,
                query.id.toString(),
            );

            const headers = new AxiosHeaders();
            headers.set(TRANSACTION_ID_HEADER, query.transactionId);

            const response = await firstValueFrom(
                this.httpService.get<BeyondtrustInstance>(url, {
                    params: ObjectUtility.stripProperties(query, 'transactionId', 'id'),
                    headers: headers,
                }),
            );

            return response.data;
        } catch (error) {
            throw ErrorProcessorUtility.composeError(error);
        }
    }
}
