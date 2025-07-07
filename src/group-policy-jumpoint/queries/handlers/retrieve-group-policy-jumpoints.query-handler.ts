import { HttpService } from '@nestjs/axios';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { AxiosHeaders } from 'axios';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { TRANSACTION_ID_HEADER } from '../../../core/decorators';
import { ErrorProcessorUtility, ObjectUtility, UrlUtility } from '../../../shared/utilities';
import { GroupPolicyJumpoint } from '../../models';
import { RetrieveGroupPolicyJumpointsQuery } from '../retrieve-group-policy-jumpoints.query';

@QueryHandler(RetrieveGroupPolicyJumpointsQuery)
export class RetrieveGroupPolicyJumpointsQueryHandler implements IQueryHandler<RetrieveGroupPolicyJumpointsQuery> {
    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly httpService: HttpService,
    ) {}

    public async execute(query: RetrieveGroupPolicyJumpointsQuery): Promise<GroupPolicyJumpoint[]> {
        try {
            const url = UrlUtility.join(
                this.appConfigService.praSyncApi.baseUrl,
                this.appConfigService.praSyncApi.groupPolicy.path,
                query.groupPolicyId.toString(),
                this.appConfigService.praSyncApi.groupPolicy.jumpoint.path,
            );

            const headers = new AxiosHeaders();
            headers.set(TRANSACTION_ID_HEADER, query.transactionId);

            const response = await firstValueFrom(
                this.httpService.get<GroupPolicyJumpoint[]>(url, {
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
