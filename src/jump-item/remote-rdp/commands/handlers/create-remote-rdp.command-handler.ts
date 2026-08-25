import { HttpService } from '@nestjs/axios';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AxiosHeaders } from 'axios';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../../../../app-config/services/app-config.service';
import { TENANT_ID_HEADER, TRANSACTION_ID_HEADER } from '../../../../core/decorators';
import { ErrorProcessorUtility, ObjectUtility, UrlUtility } from '../../../../shared/utilities';
import { RemoteRdp } from '../../models';
import { CreateRemoteRdpCommand } from '../create-remote-rdp.command';

@CommandHandler(CreateRemoteRdpCommand)
export class CreateRemoteRdpCommandHandler implements ICommandHandler<CreateRemoteRdpCommand> {
    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly httpService: HttpService,
    ) {}

    public async execute(command: CreateRemoteRdpCommand): Promise<RemoteRdp> {
        try {
            const url = UrlUtility.join(
                this.appConfigService.praSyncApi.baseUrl,
                this.appConfigService.praSyncApi.jumpItem.remoteRdp.path,
            );

            const headers = new AxiosHeaders();
            headers.set(TRANSACTION_ID_HEADER, command.transactionId);
            headers.set(TENANT_ID_HEADER, command.tenantId);

            // MARLINKPRA-55: RDP Jump Items must always be created with the "ignore
            // untrusted server certificate" flag enabled, regardless of what the caller
            // sends. This is a server-side invariant, not a client-configurable option,
            // so it is enforced here rather than as a default the client could override.
            const payload = {
                ...ObjectUtility.stripProperties(command, 'transactionId'),
                mustIgnoreUntrustedServerCert: true,
            };

            const response = await firstValueFrom(
                this.httpService.post<RemoteRdp>(url, payload, {
                    headers: headers,
                }),
            );

            return response.data;
        } catch (error) {
            throw ErrorProcessorUtility.composeError(error);
        }
    }
}
