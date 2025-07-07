import { HttpService } from '@nestjs/axios';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AxiosHeaders } from 'axios';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { TRANSACTION_ID_HEADER } from '../../../core/decorators';
import { ErrorProcessorUtility, UrlUtility } from '../../../shared/utilities';
import { DeleteJumpointCommand } from '../delete-jumpoint.command';

@CommandHandler(DeleteJumpointCommand)
export class DeleteJumpointCommandHandler implements ICommandHandler<DeleteJumpointCommand> {
    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly httpService: HttpService,
    ) {}

    public async execute(command: DeleteJumpointCommand): Promise<void> {
        try {
            const url = UrlUtility.join(
                this.appConfigService.praSyncApi.baseUrl,
                this.appConfigService.praSyncApi.jumpoint.path,
                command.id.toString(),
            );

            const headers = new AxiosHeaders();
            headers.set(TRANSACTION_ID_HEADER, command.transactionId);

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
