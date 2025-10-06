import { HttpService } from '@nestjs/axios';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AxiosHeaders } from 'axios';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { TENANT_ID_HEADER, TRANSACTION_ID_HEADER } from '../../../core/decorators';
import { ErrorProcessorUtility, ObjectUtility, UrlUtility } from '../../../shared/utilities';
import { JumpPolicy } from '../../models';
import { CreateJumpPolicyCommand } from '../create-jump-policy.command';

@CommandHandler(CreateJumpPolicyCommand)
export class CreateJumpPolicyCommandHandler implements ICommandHandler<CreateJumpPolicyCommand> {
    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly httpService: HttpService,
    ) {}

    public async execute(command: CreateJumpPolicyCommand): Promise<JumpPolicy> {
        try {
            const url = UrlUtility.join(
                this.appConfigService.praSyncApi.baseUrl,
                this.appConfigService.praSyncApi.jumpPolicy.path,
            );

            const headers = new AxiosHeaders();
            headers.set(TRANSACTION_ID_HEADER, command.transactionId);
            headers.set(TENANT_ID_HEADER, command.tenantId);

            const response = await firstValueFrom(
                this.httpService.post<JumpPolicy>(url, ObjectUtility.stripProperties(command, 'transactionId'), {
                    headers: headers,
                }),
            );

            return response.data;
        } catch (error) {
            throw ErrorProcessorUtility.composeError(error);
        }
    }
}
