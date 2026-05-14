import { HttpService } from '@nestjs/axios';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AxiosHeaders } from 'axios';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { TENANT_ID_HEADER, TRANSACTION_ID_HEADER } from '../../../core/decorators';
import { ErrorProcessorUtility, UrlUtility } from '../../../shared/utilities';
import { SyncAllExternalDiscrepanciesCommand, SyncAllExternalResult } from '../sync-all-external-discrepancies.command';

@CommandHandler(SyncAllExternalDiscrepanciesCommand)
export class SyncAllExternalDiscrepanciesCommandHandler implements ICommandHandler<SyncAllExternalDiscrepanciesCommand> {
    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly httpService: HttpService,
    ) {}

    public async execute(command: SyncAllExternalDiscrepanciesCommand): Promise<SyncAllExternalResult> {
        try {
            const url = UrlUtility.join(
                this.appConfigService.praSyncApi.baseUrl,
                this.appConfigService.praSyncApi.discrepancy.path,
                this.appConfigService.praSyncApi.discrepancy.sync.path,
                this.appConfigService.praSyncApi.discrepancy.sync.allExternal,
            );

            const headers = new AxiosHeaders();
            headers.set(TRANSACTION_ID_HEADER, command.transactionId);
            headers.set(TENANT_ID_HEADER, command.tenantId);

            const response = await firstValueFrom(this.httpService.post<SyncAllExternalResult>(url, {}, { headers }));

            return response.data;
        } catch (error) {
            throw ErrorProcessorUtility.composeError(error);
        }
    }
}
