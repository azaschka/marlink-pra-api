import { HttpService } from '@nestjs/axios';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AxiosHeaders } from 'axios';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../../../../app-config/services/app-config.service';
import { TRANSACTION_ID_HEADER } from '../../../../core/decorators';
import { ErrorProcessorUtility, ObjectUtility, UrlUtility } from '../../../../shared/utilities';
import { ProtocolTunnelJump } from '../../models';
import { ModifyProtocolTunnelJumpCommand } from '../modify-protocol-tunnel-jump.command';

@CommandHandler(ModifyProtocolTunnelJumpCommand)
export class ModifyProtocolTunnelJumpCommandHandler implements ICommandHandler<ModifyProtocolTunnelJumpCommand> {
    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly httpService: HttpService,
    ) {}

    public async execute(command: ModifyProtocolTunnelJumpCommand): Promise<ProtocolTunnelJump> {
        try {
            const url = UrlUtility.join(
                this.appConfigService.praSyncApi.baseUrl,
                this.appConfigService.praSyncApi.jumpItem.protocolTunnelJump.path,
                command.id.toString(),
            );

            const headers = new AxiosHeaders();
            headers.set(TRANSACTION_ID_HEADER, command.transactionId);

            const response = await firstValueFrom(
                this.httpService.patch<ProtocolTunnelJump>(
                    url,
                    ObjectUtility.stripProperties(command, 'transactionId', 'id'),
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
