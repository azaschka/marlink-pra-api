import { HttpService } from '@nestjs/axios';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { AxiosHeaders } from 'axios';
import qs from 'qs';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { TENANT_ID_HEADER, TRANSACTION_ID_HEADER } from '../../../core/decorators';
import { ErrorProcessorUtility, ObjectUtility, UrlUtility } from '../../../shared/utilities';
import { JumpClientInstaller } from '../../models';
import { RetrieveJumpClientInstallersQuery } from '../retrieve-jump-client-installers.query';

@QueryHandler(RetrieveJumpClientInstallersQuery)
export class RetrieveJumpClientInstallersQueryHandler implements IQueryHandler<RetrieveJumpClientInstallersQuery> {
    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly httpService: HttpService,
    ) {}

    public async execute(query: RetrieveJumpClientInstallersQuery): Promise<JumpClientInstaller[]> {
        try {
            const url = UrlUtility.join(
                this.appConfigService.praSyncApi.baseUrl,
                this.appConfigService.praSyncApi.jumpClient.path,
                this.appConfigService.praSyncApi.jumpClient.installer.path,
            );

            const headers = new AxiosHeaders();
            headers.set(TRANSACTION_ID_HEADER, query.transactionId);
            headers.set(TENANT_ID_HEADER, query.tenantId);

            const response = await firstValueFrom(
                this.httpService.get<JumpClientInstaller[]>(url, {
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
