import { HttpService } from '@nestjs/axios';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AxiosHeaders } from 'axios';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { TRANSACTION_ID_HEADER } from '../../../core/decorators';
import { ErrorProcessorUtility, UrlUtility } from '../../../shared/utilities';
import { RemoveUserFromTeamCommand } from '../remove-user-from-team.command';

@CommandHandler(RemoveUserFromTeamCommand)
export class RemoveUserFromTeamCommandHandler implements ICommandHandler<RemoveUserFromTeamCommand> {
    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly httpService: HttpService,
    ) {}

    public async execute(command: RemoveUserFromTeamCommand): Promise<void> {
        try {
            const url = UrlUtility.join(
                this.appConfigService.praSyncApi.baseUrl,
                this.appConfigService.praSyncApi.team.path,
                command.id.toString(),
                this.appConfigService.praSyncApi.team.user.path,
                command.userId.toString(),
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
