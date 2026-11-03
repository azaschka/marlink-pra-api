import { HttpService } from '@nestjs/axios';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AxiosHeaders } from 'axios';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { TENANT_ID_HEADER, TRANSACTION_ID_HEADER } from '../../../core/decorators';
import { ErrorProcessorUtility, UrlUtility } from '../../../shared/utilities';
import { GroupPolicyUserRemoval } from '../../models';
import { RemoveUserFromGroupPolicyCommand } from '../remove-user-from-group-policy.command';

@CommandHandler(RemoveUserFromGroupPolicyCommand)
export class RemoveUserFromGroupPolicyCommandHandler implements ICommandHandler<RemoveUserFromGroupPolicyCommand> {
    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly httpService: HttpService,
    ) {}

    public async execute(command: RemoveUserFromGroupPolicyCommand): Promise<GroupPolicyUserRemoval> {
        try {
            const url = UrlUtility.join(
                this.appConfigService.praSyncApi.baseUrl,
                this.appConfigService.praSyncApi.groupPolicy.path,
                command.id.toString(),
                this.appConfigService.praSyncApi.groupPolicy.member.path,
                this.appConfigService.praSyncApi.groupPolicy.member.user.path,
                command.userId.toString(),
            );

            const headers = new AxiosHeaders();
            headers.set(TRANSACTION_ID_HEADER, command.transactionId);
            headers.set(TENANT_ID_HEADER, command.tenantId);

            const response = await firstValueFrom(
                this.httpService.delete<GroupPolicyUserRemoval>(url, {
                    headers: headers,
                    params: { verifyEffectiveMembership: command.shouldVerifyEffectiveMembership },
                }),
            );

            return response.data;
        } catch (error) {
            throw ErrorProcessorUtility.composeError(error);
        }
    }
}
