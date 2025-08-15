import { NotFoundException } from '@nestjs/common';
import { CommandBus, CommandHandler, EventBus, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { PasswordGeneratorUtility } from '../../../shared/utilities';
import { UserForgotPasswordProcessedEvent } from '../../events';
import { User } from '../../models';
import { RetrieveUsersQuery } from '../../queries';
import { ModifyUserCommand } from '../modify-user.command';
import { ProcessUserForgotPasswordCommand } from '../process-user-forgot-password.command';

@CommandHandler(ProcessUserForgotPasswordCommand)
export class ProcessUserForgotPasswordCommandHandler implements ICommandHandler<ProcessUserForgotPasswordCommand> {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
        private readonly eventBus: EventBus,
    ) {}

    public async execute(command: ProcessUserForgotPasswordCommand): Promise<void> {
        const user = await this.getUser(command.transactionId, command.email);
        const newPassword = PasswordGeneratorUtility.generate();

        await this.modifyUserPassword(command.transactionId, user, newPassword);

        this.eventBus.publish(
            new UserForgotPasswordProcessedEvent(command.transactionId, {
                email: command.email,
                username: user.publicDisplayName,
                password: newPassword,
            }),
        );
    }

    private async getUser(transactionId: string, email: string): Promise<User> {
        const users = await this.queryBus.execute<RetrieveUsersQuery, User[]>(
            new RetrieveUsersQuery(transactionId, 1, 1, undefined, undefined, email),
        );

        if (users.length === 0 || !users[0]) {
            throw new NotFoundException(`User with email ${email} not found`);
        }

        return users[0];
    }

    private async modifyUserPassword(transactionId: string, user: User, newPassword: string) {
        await this.commandBus.execute<ModifyUserCommand, User>(
            new ModifyUserCommand(transactionId, user.id, undefined, undefined, newPassword),
        );
    }
}
