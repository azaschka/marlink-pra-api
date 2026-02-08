import { HttpService } from '@nestjs/axios';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AxiosHeaders } from 'axios';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { TRANSACTION_ID_HEADER } from '../../../core/decorators';
import { ErrorProcessorUtility, ObjectUtility, UrlUtility } from '../../../shared/utilities';
import { BeyondtrustInstanceBackup } from '../../models';
import { CreateBeyondtrustInstanceBackupCommand } from '../create-beyondtrust-instance-backup.command';

@CommandHandler(CreateBeyondtrustInstanceBackupCommand)
export class CreateBeyondtrustInstanceBackupCommandHandler implements ICommandHandler<CreateBeyondtrustInstanceBackupCommand> {
    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly httpService: HttpService,
    ) {}

    public async execute(command: CreateBeyondtrustInstanceBackupCommand): Promise<BeyondtrustInstanceBackup> {
        try {
            const url = UrlUtility.join(
                this.appConfigService.praSyncApi.baseUrl,
                this.appConfigService.praSyncApi.beyondtrustInstance.path,
                command.beyondtrustInstanceId.toString(),
                this.appConfigService.praSyncApi.beyondtrustInstance.backup.path,
            );

            const headers = new AxiosHeaders();
            headers.set(TRANSACTION_ID_HEADER, command.transactionId);

            const response = await firstValueFrom(
                this.httpService.post<BeyondtrustInstanceBackup>(
                    url,
                    ObjectUtility.stripProperties(command, 'transactionId', 'beyondtrustInstanceId'),
                    {
                        headers: headers,
                    },
                ),
            );

            return response.data;
        } catch (error) {
            throw ErrorProcessorUtility.composeError(error);
        }
    }
}
