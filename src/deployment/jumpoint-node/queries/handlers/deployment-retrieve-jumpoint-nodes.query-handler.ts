import { HttpService } from '@nestjs/axios';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { AxiosHeaders } from 'axios';
import qs from 'qs';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../../../../app-config/services/app-config.service';
import { TRANSACTION_ID_HEADER } from '../../../../core/decorators';
import { ErrorProcessorUtility, ObjectUtility, UrlUtility } from '../../../../shared/utilities';
import { JumpointNode } from '../../models';
import { DeploymentRetrieveJumpointNodesQuery } from '../deployment-retrieve-jumpoint-nodes.query';

@QueryHandler(DeploymentRetrieveJumpointNodesQuery)
export class DeploymentRetrieveJumpointNodesQueryHandler implements IQueryHandler<DeploymentRetrieveJumpointNodesQuery> {
    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly httpService: HttpService,
    ) {}

    public async execute(query: DeploymentRetrieveJumpointNodesQuery): Promise<JumpointNode[]> {
        try {
            const url = UrlUtility.join(
                this.appConfigService.praSyncApi.baseUrl,
                this.appConfigService.praSyncApi.deployments.path,
                this.appConfigService.praSyncApi.deployments.jumpointNode.path,
            );

            const headers = new AxiosHeaders();
            headers.set(TRANSACTION_ID_HEADER, query.transactionId);

            const response = await firstValueFrom(
                this.httpService.get<JumpointNode[]>(url, {
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
