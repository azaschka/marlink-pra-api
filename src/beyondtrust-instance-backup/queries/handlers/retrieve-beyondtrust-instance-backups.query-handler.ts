import { HttpService } from '@nestjs/axios';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { AxiosHeaders } from 'axios';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { TRANSACTION_ID_HEADER } from '../../../core/decorators';
import { ErrorProcessorUtility, ObjectUtility, UrlUtility } from '../../../shared/utilities';
import { BeyondtrustInstanceBackup } from '../../models';
import { RetrieveBeyondtrustInstanceBackupsQuery } from '../retrieve-beyondtrust-instance-backups.query';

@QueryHandler(RetrieveBeyondtrustInstanceBackupsQuery)
export class RetrieveBeyondtrustInstanceBackupsQueryHandler implements IQueryHandler<RetrieveBeyondtrustInstanceBackupsQuery> {
    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly httpService: HttpService,
    ) {}

    public async execute(query: RetrieveBeyondtrustInstanceBackupsQuery): Promise<BeyondtrustInstanceBackup[]> {
        try {
            const url = UrlUtility.join(
                this.appConfigService.praSyncApi.baseUrl,
                this.appConfigService.praSyncApi.beyondtrustInstance.path,
                query.beyondtrustInstanceId.toString(),
                this.appConfigService.praSyncApi.beyondtrustInstance.backup.path,
            );

            const headers = new AxiosHeaders();
            headers.set(TRANSACTION_ID_HEADER, query.transactionId);

            const response = await firstValueFrom(
                this.httpService.get<BeyondtrustInstanceBackup[]>(url, {
                    params: ObjectUtility.stripProperties(query, 'transactionId', 'beyondtrustInstanceId'),
                    headers: headers,
                }),
            );

            return response.data;
        } catch (error) {
            throw ErrorProcessorUtility.composeError(error);
        }
    }
}
