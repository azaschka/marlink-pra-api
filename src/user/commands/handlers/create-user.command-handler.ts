import { HttpService } from '@nestjs/axios';
import { HttpStatus } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AxiosHeaders } from 'axios';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { TRANSACTION_ID_HEADER } from '../../../core/decorators';
import { SendUserActivationEmailCommand } from '../../../email/commands';
import { ErrorProcessorUtility, ObjectUtility, PasswordGeneratorUtility, UrlUtility } from '../../../shared/utilities';
import { User } from '../../models';
import { CreateUserCommand } from '../create-user.command';

@CommandHandler(CreateUserCommand)
export class CreateUserCommandHandler implements ICommandHandler<CreateUserCommand> {
    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly httpService: HttpService,
        private readonly commandBus: CommandBus,
    ) {}

    public async execute(command: CreateUserCommand): Promise<User> {
        try {
            const url = UrlUtility.join(
                this.appConfigService.praSyncApi.baseUrl,
                this.appConfigService.praSyncApi.user.path,
            );

            const headers = new AxiosHeaders();
            headers.set(TRANSACTION_ID_HEADER, command.transactionId);

            // Always generate a password if not provided
            if (!command.password) {
                (command.password as string) = PasswordGeneratorUtility.generate();
            }

            const response = await firstValueFrom(
                this.httpService.post<User>(url, ObjectUtility.stripProperties(command, 'transactionId'), {
                    headers: headers,
                }),
            );

            // TODO Replace with event handler/saga once the event transporter is implemented.
            // Use user created event from PRA Sync API to trigger the email sending
            if (response.status === HttpStatus.CREATED.valueOf()) {
                this.trySendUserActivationEmailAsync(command.transactionId, response.data, command.password!);
            }

            return response.data;
        } catch (error) {
            throw ErrorProcessorUtility.composeError(error);
        }
    }

    private trySendUserActivationEmailAsync(transactionId: string, user: User, password: string): void {
        if (!user.email) {
            console.warn(`User with ID ${user.id} does not have an email address, skipping activation email.`);
            return;
        }

        void this.commandBus
            .execute(
                new SendUserActivationEmailCommand(
                    transactionId,
                    user.email,
                    user.publicDisplayName,
                    user.username ?? user.email, // Username and email should match in most cases
                    password,
                ),
            )
            .catch((error) => {
                console.error(
                    `Failed to send activation email for user ${user.id}:`,
                    ErrorProcessorUtility.stringify(error),
                );
            });
    }
}
