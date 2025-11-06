import { HttpService } from '@nestjs/axios';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AxiosHeaders } from 'axios';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { TENANT_ID_HEADER, TRANSACTION_ID_HEADER } from '../../../core/decorators';
import { ErrorProcessorUtility, ObjectUtility, UrlUtility } from '../../../shared/utilities';
import { JumpClientInstaller } from '../../models';
import { CreateJumpClientInstallerCommand } from '../create-jump-client-installer.command';

@CommandHandler(CreateJumpClientInstallerCommand)
export class CreateJumpClientInstallerCommandHandler implements ICommandHandler<CreateJumpClientInstallerCommand> {
    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly httpService: HttpService,
    ) {}

    public async execute(command: CreateJumpClientInstallerCommand): Promise<JumpClientInstaller> {
        try {
            const url = UrlUtility.join(
                this.appConfigService.praSyncApi.baseUrl,
                this.appConfigService.praSyncApi.jumpClient.path,
                this.appConfigService.praSyncApi.jumpClient.installer.path,
            );

            const headers = new AxiosHeaders();
            headers.set(TRANSACTION_ID_HEADER, command.transactionId);
            headers.set(TENANT_ID_HEADER, command.tenantId);

            const response = await firstValueFrom(
                this.httpService.post<JumpClientInstaller>(
                    url,
                    ObjectUtility.stripProperties(command, 'transactionId'),
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
