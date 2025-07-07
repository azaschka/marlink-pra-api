import { HttpService } from '@nestjs/axios';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AxiosHeaders } from 'axios';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { TRANSACTION_ID_HEADER } from '../../../core/decorators';
import { ErrorProcessorUtility, ObjectUtility, UrlUtility } from '../../../shared/utilities';
import { GroupPolicyJumpGroup } from '../../models';
import { AddJumpGroupToGroupPolicyCommand } from '../add-jump-group-to-group-policy.command';

@CommandHandler(AddJumpGroupToGroupPolicyCommand)
export class AddJumpGroupToGroupPolicyCommandHandler implements ICommandHandler<AddJumpGroupToGroupPolicyCommand> {
    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly httpService: HttpService,
    ) {}

    public async execute(command: AddJumpGroupToGroupPolicyCommand): Promise<GroupPolicyJumpGroup> {
        try {
            const url = UrlUtility.join(
                this.appConfigService.praSyncApi.baseUrl,
                this.appConfigService.praSyncApi.groupPolicy.path,
                command.id.toString(),
                this.appConfigService.praSyncApi.groupPolicy.jumpGroup.path,
            );

            const headers = new AxiosHeaders();
            headers.set(TRANSACTION_ID_HEADER, command.transactionId);

            const response = await firstValueFrom(
                this.httpService.post<GroupPolicyJumpGroup>(
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
