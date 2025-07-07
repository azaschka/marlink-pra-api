import { HttpService } from '@nestjs/axios';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AxiosHeaders } from 'axios';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { TRANSACTION_ID_HEADER } from '../../../core/decorators';
import { ErrorProcessorUtility, UrlUtility } from '../../../shared/utilities';
import { DeleteJumpClientInstallerCommand } from '../delete-jump-client-installer.command';

@CommandHandler(DeleteJumpClientInstallerCommand)
export class DeleteJumpClientInstallerCommandHandler implements ICommandHandler<DeleteJumpClientInstallerCommand> {
    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly httpService: HttpService,
    ) {}

    public async execute(command: DeleteJumpClientInstallerCommand): Promise<void> {
        try {
            const url = UrlUtility.join(
                this.appConfigService.praSyncApi.baseUrl,
                this.appConfigService.praSyncApi.jumpClient.path,
                this.appConfigService.praSyncApi.jumpClient.installer.path,
                command.id.toString(),
            );

            const headers = new AxiosHeaders();
            headers.set(TRANSACTION_ID_HEADER, command.transactionId);

            await firstValueFrom(
                this.httpService.delete(url, {
                    headers: headers,
                }),
            );
        } catch (error) {
            throw ErrorProcessorUtility.composeError(error);
        }
    }
}
