import { HttpService } from '@nestjs/axios';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AxiosHeaders } from 'axios';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { TENANT_ID_HEADER, TRANSACTION_ID_HEADER } from '../../../core/decorators';
import { ErrorProcessorUtility, UrlUtility } from '../../../shared/utilities';
import { RemoveJumpGroupFromGroupPolicyCommand } from '../remove-jump-group-from-group-policy.command';

@CommandHandler(RemoveJumpGroupFromGroupPolicyCommand)
export class RemoveJumpGroupFromGroupPolicyCommandHandler implements ICommandHandler<RemoveJumpGroupFromGroupPolicyCommand> {
    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly httpService: HttpService,
    ) {}

    public async execute(command: RemoveJumpGroupFromGroupPolicyCommand): Promise<void> {
        try {
            const url = UrlUtility.join(
                this.appConfigService.praSyncApi.baseUrl,
                this.appConfigService.praSyncApi.groupPolicy.path,
                command.id.toString(),
                this.appConfigService.praSyncApi.groupPolicy.jumpGroup.path,
                command.jumpGroupId.toString(),
            );

            const headers = new AxiosHeaders();
            headers.set(TRANSACTION_ID_HEADER, command.transactionId);
            headers.set(TENANT_ID_HEADER, command.tenantId);

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
