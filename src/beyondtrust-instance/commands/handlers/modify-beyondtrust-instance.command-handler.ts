import { HttpService } from '@nestjs/axios';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AxiosHeaders } from 'axios';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { TRANSACTION_ID_HEADER } from '../../../core/decorators';
import { ErrorProcessorUtility, ObjectUtility, UrlUtility } from '../../../shared/utilities';
import { BeyondtrustInstance } from '../../models';
import { ModifyBeyondtrustInstanceCommand } from '../modify-beyondtrust-instance.command';

@CommandHandler(ModifyBeyondtrustInstanceCommand)
export class ModifyBeyondtrustInstanceCommandHandler implements ICommandHandler<ModifyBeyondtrustInstanceCommand> {
    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly httpService: HttpService,
    ) {}

    public async execute(command: ModifyBeyondtrustInstanceCommand): Promise<BeyondtrustInstance> {
        try {
            const url = UrlUtility.join(
                this.appConfigService.praSyncApi.baseUrl,
                this.appConfigService.praSyncApi.beyondtrustInstance.path,
                command.id.toString(),
            );

            const headers = new AxiosHeaders();
            headers.set(TRANSACTION_ID_HEADER, command.transactionId);

            const response = await firstValueFrom(
                this.httpService.patch<BeyondtrustInstance>(
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
