import { HttpService } from '@nestjs/axios';
import { HttpStatus } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { AxiosHeaders } from 'axios';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { TENANT_ID_HEADER, TRANSACTION_ID_HEADER } from '../../../core/decorators';
import { SendUserActivationEmailCommand } from '../../../email/commands';
import { RetrieveBeyondtrustInstanceByIdQuery } from '../../../beyondtrust-instance/queries';
import { BeyondtrustInstance } from '../../../beyondtrust-instance/models';
import { ErrorProcessorUtility, ObjectUtility, PasswordGeneratorUtility, UrlUtility } from '../../../shared/utilities';
import { User } from '../../models';
import { CreateUserCommand } from '../create-user.command';

@CommandHandler(CreateUserCommand)
export class CreateUserCommandHandler implements ICommandHandler<CreateUserCommand> {
    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly httpService: HttpService,
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    public async execute(command: CreateUserCommand): Promise<User> {
        try {
            const url = UrlUtility.join(
                this.appConfigService.praSyncApi.baseUrl,
                this.appConfigService.praSyncApi.user.path,
            );

            const headers = new AxiosHeaders();
            headers.set(TRANSACTION_ID_HEADER, command.transactionId);
            headers.set(TENANT_ID_HEADER, command.tenantId);

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
                void this.trySendUserActivationEmailAsync(
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

    private async trySendUserActivationEmailAsync(
        transactionId: string,
        user: User,
        password: string,
        tenantId: number,
    ): Promise<void> {
        if (!user.email) {
            console.warn(`User with ID ${user.id} does not have an email address, skipping activation email.`);
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
                new SendUserActivationEmailCommand(
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
                    `Failed to send activation email for user ${user.id}:`,
                    ErrorProcessorUtility.stringify(error),
                );
            });
    }
}
