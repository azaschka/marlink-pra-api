import { HttpService } from '@nestjs/axios';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AxiosHeaders } from 'axios';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { TRANSACTION_ID_HEADER } from '../../../core/decorators';
import { ErrorProcessorUtility, ObjectUtility, UrlUtility } from '../../../shared/utilities';
import { UserGroupPolicy } from '../../models';
import { ModifyUserGroupPoliciesCommand } from '../modify-user-group-policies.command';

@CommandHandler(ModifyUserGroupPoliciesCommand)
export class ModifyUserGroupPoliciesCommandHandler implements ICommandHandler<ModifyUserGroupPoliciesCommand> {
    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly httpService: HttpService,
    ) {}

    public async execute(command: ModifyUserGroupPoliciesCommand): Promise<UserGroupPolicy[]> {
        try {
            const url = UrlUtility.join(
                this.appConfigService.praSyncApi.baseUrl,
                this.appConfigService.praSyncApi.user.path,
                command.userId.toString(),
                this.appConfigService.praSyncApi.user.groupPolicy.path,
            );

            const headers = new AxiosHeaders();
            headers.set(TRANSACTION_ID_HEADER, command.transactionId);

            const response = await firstValueFrom(
                this.httpService.patch<UserGroupPolicy[]>(
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
