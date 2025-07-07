import { HttpService } from '@nestjs/axios';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { AxiosHeaders } from 'axios';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { TRANSACTION_ID_HEADER } from '../../../core/decorators';
import { ErrorProcessorUtility, ObjectUtility, UrlUtility } from '../../../shared/utilities';
import { GroupPolicyMember } from '../../models';
import { RetrieveGroupPolicyMembersQuery } from '../retrieve-group-policy-members.query';

@QueryHandler(RetrieveGroupPolicyMembersQuery)
export class RetrieveGroupPolicyMembersQueryHandler implements IQueryHandler<RetrieveGroupPolicyMembersQuery> {
    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly httpService: HttpService,
    ) {}

    public async execute(query: RetrieveGroupPolicyMembersQuery): Promise<GroupPolicyMember[]> {
        try {
            const url = UrlUtility.join(
                this.appConfigService.praSyncApi.baseUrl,
                this.appConfigService.praSyncApi.groupPolicy.path,
                query.groupPolicyId.toString(),
                this.appConfigService.praSyncApi.groupPolicy.member.path,
            );

            const headers = new AxiosHeaders();
            headers.set(TRANSACTION_ID_HEADER, query.transactionId);

            const response = await firstValueFrom(
                this.httpService.get<GroupPolicyMember[]>(url, {
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
