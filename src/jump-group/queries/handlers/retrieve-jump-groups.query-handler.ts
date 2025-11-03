import { HttpService } from '@nestjs/axios';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { AxiosHeaders } from 'axios';
import qs from 'qs';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { TENANT_ID_HEADER, TRANSACTION_ID_HEADER } from '../../../core/decorators';
import { ErrorProcessorUtility, ObjectUtility, UrlUtility } from '../../../shared/utilities';
import { JumpGroup } from '../../models';
import { RetrieveJumpGroupsQuery } from '../retrieve-jump-groups.query';

@QueryHandler(RetrieveJumpGroupsQuery)
export class RetrieveJumpGroupsQueryHandler implements IQueryHandler<RetrieveJumpGroupsQuery> {
    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly httpService: HttpService,
    ) {}

    public async execute(query: RetrieveJumpGroupsQuery): Promise<JumpGroup[]> {
        try {
            const url = UrlUtility.join(
                this.appConfigService.praSyncApi.baseUrl,
                this.appConfigService.praSyncApi.jumpGroup.path,
            );

            const headers = new AxiosHeaders();
            headers.set(TRANSACTION_ID_HEADER, query.transactionId);
            headers.set(TENANT_ID_HEADER, query.tenantId);

            const response = await firstValueFrom(
                this.httpService.get<JumpGroup[]>(url, {
                    params: ObjectUtility.stripProperties(query, 'transactionId'),
                    headers: headers,
                    paramsSerializer: (params) => qs.stringify(params, { arrayFormat: 'repeat' }),
                }),
            );

            return response.data;
        } catch (error) {
            throw ErrorProcessorUtility.composeError(error);
        }
    }
}
