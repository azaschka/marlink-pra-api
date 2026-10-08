import { HttpService } from '@nestjs/axios';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AxiosHeaders } from 'axios';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { TENANT_ID_HEADER, TRANSACTION_ID_HEADER } from '../../../core/decorators';
import { ErrorProcessorUtility, ObjectUtility, UrlUtility } from '../../../shared/utilities';
import { Discrepancy } from '../../models';
import { ScanDiscrepancyCommand } from '../scan-discrepancy.command';

@CommandHandler(ScanDiscrepancyCommand)
export class ScanDiscrepancyCommandHandler implements ICommandHandler<ScanDiscrepancyCommand> {
    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly httpService: HttpService,
    ) {}

    public async execute(command: ScanDiscrepancyCommand): Promise<Discrepancy> {
        try {
            const url = UrlUtility.join(
                this.appConfigService.praSyncApi.baseUrl,
                this.appConfigService.praSyncApi.discrepancy.path,
                this.appConfigService.praSyncApi.discrepancy.scan.path,
                command.entityType,
            );

            const headers = new AxiosHeaders();
            headers.set(TRANSACTION_ID_HEADER, command.transactionId);
            headers.set(TENANT_ID_HEADER, command.tenantId);

            const response = await firstValueFrom(
                this.httpService.post<Discrepancy>(url, ObjectUtility.stripProperties(command, 'transactionId'), {
                    headers: headers,
                    // The Sync API answers when the scan of this type is done, bounded by its scan budget.
                    timeout: this.appConfigService.praSyncApiTimeouts.scanInMs,
                }),
            );

            return response.data;
        } catch (error) {
            throw ErrorProcessorUtility.composeError(error);
        }
    }
}
