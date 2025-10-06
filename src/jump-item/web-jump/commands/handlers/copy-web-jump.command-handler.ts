import { HttpService } from '@nestjs/axios';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AxiosHeaders } from 'axios';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../../../../app-config/services/app-config.service';
import { TENANT_ID_HEADER, TRANSACTION_ID_HEADER } from '../../../../core/decorators';
import { ErrorProcessorUtility, ObjectUtility, UrlUtility } from '../../../../shared/utilities';
import { WebJump } from '../../models';
import { CopyWebJumpCommand } from '../copy-web-jump.command';

@CommandHandler(CopyWebJumpCommand)
export class CopyWebJumpCommandHandler implements ICommandHandler<CopyWebJumpCommand> {
    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly httpService: HttpService,
    ) {}

    public async execute(command: CopyWebJumpCommand): Promise<WebJump> {
        try {
            const url = UrlUtility.join(
                this.appConfigService.praSyncApi.baseUrl,
                this.appConfigService.praSyncApi.jumpItem.webJump.path,
                command.id.toString(),
                this.appConfigService.praSyncApi.jumpItem.webJump.copy,
            );

            const headers = new AxiosHeaders();
            headers.set(TRANSACTION_ID_HEADER, command.transactionId);
            headers.set(TENANT_ID_HEADER, command.tenantId);

            const response = await firstValueFrom(
                this.httpService.post<WebJump>(url, ObjectUtility.stripProperties(command, 'transactionId'), {
                    headers: headers,
                }),
            );

            return response.data;
        } catch (error) {
            throw ErrorProcessorUtility.composeError(error);
        }
    }
}
