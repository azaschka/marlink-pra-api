import { HttpService } from '@nestjs/axios';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AxiosHeaders } from 'axios';
import { firstValueFrom } from 'rxjs';
import { SendUserNewPasswordEmailCommand } from 'src/email/commands';
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
    ) {}

    public async execute(command: ModifyUserCommand): Promise<User> {
        try {
            const url = UrlUtility.join(
                this.appConfigService.praSyncApi.baseUrl,
                this.appConfigService.praSyncApi.user.path,
                command.id.toString(),
            );

            if (command.regeneratePassword) {
                (command.password as string) = PasswordGeneratorUtility.generate();
                (command.mustResetPasswordOnNextLogin as boolean) = true;
            }

            const headers = new AxiosHeaders();
            headers.set(TRANSACTION_ID_HEADER, command.transactionId);
            headers.set(TENANT_ID_HEADER, command.tenantId);

            const response = await firstValueFrom(
                this.httpService.patch<User>(url, ObjectUtility.stripProperties(command, 'transactionId', 'id'), {
                    headers: headers,
                }),
            );

            if (command.regeneratePassword) {
                this.trySendUserNewPasswordEmailAsync(command.transactionId, response.data, command.password!);
            }

            return response.data;
        } catch (error) {
            throw ErrorProcessorUtility.composeError(error);
        }
    }

    private trySendUserNewPasswordEmailAsync(transactionId: string, user: User, password: string): void {
        if (!user.email) {
            console.warn(`User with ID ${user.id} does not have an email address, skipping new password email.`);
            return;
        }

        void this.commandBus
            .execute(
                new SendUserNewPasswordEmailCommand(
                    transactionId,
                    user.email,
                    user.publicDisplayName,
                    user.username ?? user.email, // Username and email should match in most cases
                    password,
                ),
            )
            .catch((error) => {
                console.error(
                    `Failed to send new password email for user ${user.id}:`,
                    ErrorProcessorUtility.stringify(error),
                );
            });
    }
}
