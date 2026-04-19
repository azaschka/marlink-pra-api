import { HttpService } from '@nestjs/axios';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AxiosHeaders } from 'axios';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../../../../app-config/services/app-config.service';
import { TRANSACTION_ID_HEADER } from '../../../../core/decorators';
import { ErrorProcessorUtility, ObjectUtility, UrlUtility } from '../../../../shared/utilities';
import { JumpointNode } from '../../models';
import { ApproveJumpointNodeCommand } from '../approve-jumpoint-node.command';

@CommandHandler(ApproveJumpointNodeCommand)
export class ApproveJumpointNodeCommandHandler implements ICommandHandler<ApproveJumpointNodeCommand> {
    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly httpService: HttpService,
    ) {}

    public async execute(command: ApproveJumpointNodeCommand): Promise<JumpointNode> {
        try {
            const url = UrlUtility.join(
                this.appConfigService.praSyncApi.baseUrl,
                this.appConfigService.praSyncApi.deployments.path,
                this.appConfigService.praSyncApi.deployments.jumpointNode.path,
                command.id.toString(),
                this.appConfigService.praSyncApi.deployments.jumpointNode.approve,
            );

            const headers = new AxiosHeaders();
            headers.set(TRANSACTION_ID_HEADER, command.transactionId);

            const response = await firstValueFrom(
                this.httpService.post<JumpointNode>(url, ObjectUtility.stripProperties(command, 'transactionId'), {
                    headers: headers,
                }),
            );

            return response.data;
        } catch (error) {
            throw ErrorProcessorUtility.composeError(error);
        }
    }
}
