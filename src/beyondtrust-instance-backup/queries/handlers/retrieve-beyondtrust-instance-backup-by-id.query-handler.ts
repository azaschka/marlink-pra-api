import { HttpService } from '@nestjs/axios';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { AxiosHeaders } from 'axios';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { TRANSACTION_ID_HEADER } from '../../../core/decorators';
import { ErrorProcessorUtility, ObjectUtility, UrlUtility } from '../../../shared/utilities';
import { BeyondtrustInstanceBackup } from '../../models';
import { RetrieveBeyondtrustInstanceBackupByIdQuery } from '../retrieve-beyondtrust-instance-backup-by-id.query';

@QueryHandler(RetrieveBeyondtrustInstanceBackupByIdQuery)
export class RetrieveBeyondtrustInstanceBackupByIdQueryHandler implements IQueryHandler<RetrieveBeyondtrustInstanceBackupByIdQuery> {
    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly httpService: HttpService,
    ) {}

    public async execute(query: RetrieveBeyondtrustInstanceBackupByIdQuery): Promise<BeyondtrustInstanceBackup> {
        try {
            const url = UrlUtility.join(
                this.appConfigService.praSyncApi.baseUrl,
                this.appConfigService.praSyncApi.beyondtrustInstance.path,
                query.beyondtrustInstanceId.toString(),
                this.appConfigService.praSyncApi.beyondtrustInstance.backup.path,
                query.id.toString(),
            );

            const headers = new AxiosHeaders();
            headers.set(TRANSACTION_ID_HEADER, query.transactionId);

            const response = await firstValueFrom(
                this.httpService.get<BeyondtrustInstanceBackup>(url, {
                    params: ObjectUtility.stripProperties(query, 'transactionId', 'beyondtrustInstanceId', 'id'),
                    headers: headers,
                }),
            );

            return response.data;
        } catch (error) {
            throw ErrorProcessorUtility.composeError(error);
        }
    }
}
