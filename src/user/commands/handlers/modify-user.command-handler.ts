import { HttpService } from '@nestjs/axios';
import { CommandBus, CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { AxiosHeaders } from 'axios';
import { firstValueFrom } from 'rxjs';
import { SendUserNewPasswordEmailCommand } from 'src/email/commands';
import { RetrieveBeyondtrustInstanceByIdQuery } from '../../../beyondtrust-instance/queries';
import { BeyondtrustInstance } from '../../../beyondtrust-instance/models';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { TENANT_ID_HEADER, TRANSACTION_ID_HEADER } from '../../../core/decorators';
import { ErrorProcessorUtility, ObjectUtility, PasswordGeneratorUtility, UrlUtility } from '../../../shared/utilities';
import { User } from '../../models';
import { ModifyUserCommand } from '../modify-user.command';

@CommandHandler(ModifyUserCommand)
export class ModifyUserCommandHandler implements ICommandHandler<ModifyUserCommand> {
    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly httpService: HttpService,
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    public async execute(command: ModifyUserCommand): Promise<User> {
        try {
            const url = UrlUtility.join(
                this.appConfigService.praSyncApi.baseUrl,
                this.appConfigService.praSyncApi.user.path,
                command.id.toString(),
            );

            if (command.mustResetPasswordOnNextLogin) {
                (command.password as string) = PasswordGeneratorUtility.generate();
            }

            const headers = new AxiosHeaders();
            headers.set(TRANSACTION_ID_HEADER, command.transactionId);
            headers.set(TENANT_ID_HEADER, command.tenantId);

            const response = await firstValueFrom(
                this.httpService.patch<User>(url, ObjectUtility.stripProperties(command, 'transactionId', 'id'), {
                    headers: headers,
                }),
            );

            if (command.mustResetPasswordOnNextLogin) {
                void this.trySendUserNewPasswordEmailAsync(
                    command.transactionId,
                    response.data,
                    command.password!,
                    command.tenantId,
                );
            }

            return response.data;
        } catch (error) {
            throw ErrorProcessorUtility.composeError(error);
        }
    }

    private async trySendUserNewPasswordEmailAsync(
        transactionId: string,
        user: User,
        password: string,
        tenantId: number,
    ): Promise<void> {
        if (!user.email) {
            console.warn(`[${transactionId}] User ${user.id} has no email address, skipping new password email.`);
            return;
        }

        const cname = await this.queryBus
            .execute<RetrieveBeyondtrustInstanceByIdQuery, BeyondtrustInstance>(
                new RetrieveBeyondtrustInstanceByIdQuery(transactionId, tenantId),
            )
            .then((instance) => instance?.cname ?? null)
            .catch(() => null);

        await this.commandBus
            .execute(
                new SendUserNewPasswordEmailCommand(
                    transactionId,
                    user.email,
                    user.publicDisplayName,
                    user.username ?? user.email, // Username and email should match in most cases
                    password,
                    cname,
                ),
            )
            .catch((error) => {
                console.error(
                    `[${transactionId}] Failed to send new password email for user ${user.id}:`,
                    ErrorProcessorUtility.stringify(error),
                );
            });
    }
}
