import { HttpService } from '@nestjs/axios';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { AxiosHeaders } from 'axios';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../../../../app-config/services/app-config.service';
import { TENANT_ID_HEADER, TRANSACTION_ID_HEADER } from '../../../../core/decorators';
import { ErrorProcessorUtility, ObjectUtility, UrlUtility } from '../../../../shared/utilities';
import { ProtocolTunnelJump } from '../../models';
import { RetrieveProtocolTunnelJumpsQuery } from '../retrieve-protocol-tunnel-jumps.query';

@QueryHandler(RetrieveProtocolTunnelJumpsQuery)
export class RetrieveProtocolTunnelJumpsQueryHandler implements IQueryHandler<RetrieveProtocolTunnelJumpsQuery> {
    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly httpService: HttpService,
    ) {}

    public async execute(query: RetrieveProtocolTunnelJumpsQuery): Promise<ProtocolTunnelJump[]> {
        try {
            const url = UrlUtility.join(
                this.appConfigService.praSyncApi.baseUrl,
                this.appConfigService.praSyncApi.jumpItem.protocolTunnelJump.path,
            );

            const headers = new AxiosHeaders();
            headers.set(TRANSACTION_ID_HEADER, query.transactionId);
            headers.set(TENANT_ID_HEADER, query.tenantId);

            const response = await firstValueFrom(
                this.httpService.get<ProtocolTunnelJump[]>(url, {
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
