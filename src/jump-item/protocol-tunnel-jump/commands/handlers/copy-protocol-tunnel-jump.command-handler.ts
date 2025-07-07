import { HttpService } from '@nestjs/axios';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AxiosHeaders } from 'axios';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../../../../app-config/services/app-config.service';
import { TRANSACTION_ID_HEADER } from '../../../../core/decorators';
import { ErrorProcessorUtility, ObjectUtility, UrlUtility } from '../../../../shared/utilities';
import { ProtocolTunnelJump } from '../../models';
import { CopyProtocolTunnelJumpCommand } from '../copy-protocol-tunnel-jump.command';

@CommandHandler(CopyProtocolTunnelJumpCommand)
export class CopyProtocolTunnelJumpCommandHandler implements ICommandHandler<CopyProtocolTunnelJumpCommand> {
    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly httpService: HttpService,
    ) {}

    public async execute(command: CopyProtocolTunnelJumpCommand): Promise<ProtocolTunnelJump> {
        try {
            const url = UrlUtility.join(
                this.appConfigService.praSyncApi.baseUrl,
                this.appConfigService.praSyncApi.jumpItem.protocolTunnelJump.path,
                command.id.toString(),
                this.appConfigService.praSyncApi.jumpItem.protocolTunnelJump.copy,
            );

            const headers = new AxiosHeaders();
            headers.set(TRANSACTION_ID_HEADER, command.transactionId);

            const response = await firstValueFrom(
                this.httpService.post<ProtocolTunnelJump>(
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
