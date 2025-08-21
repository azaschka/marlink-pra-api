import { NotFoundException } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import * as bcrypt from 'bcrypt';
import { ErrorProcessorUtility, PasswordGeneratorUtility } from '../../../shared/utilities';
import { SendUserForgotPasswordEmailCommand } from '../../../email/commands';
import { PraUserEntity } from '../../repositories/entities';
import { PraUserRepositoryService } from '../../repositories/services/pra-user-repository.service';
import { PraUserForgotPasswordCommand } from '../pra-user-forgot-password.command';

@CommandHandler(PraUserForgotPasswordCommand)
export class PraUserForgotPasswordCommandHandler implements ICommandHandler<PraUserForgotPasswordCommand> {
    private static readonly SALT_ROUNDS = 10;

    constructor(
        private readonly commandBus: CommandBus,
        private readonly praUserRepositoryService: PraUserRepositoryService,
    ) {}

    public async execute(command: PraUserForgotPasswordCommand): Promise<void> {
        const praUserEntity = await this.praUserRepositoryService.findOneByEmail(command.email);
        if (!praUserEntity) {
            throw new NotFoundException();
        }

        const newPassword = PasswordGeneratorUtility.generate();
        const hashedPassword = await bcrypt.hash(newPassword, PraUserForgotPasswordCommandHandler.SALT_ROUNDS);

        const modifiedPraUserEntity = PraUserEntity.create(
            praUserEntity.id,
            praUserEntity.username,
            hashedPassword,
            praUserEntity.email,
            praUserEntity.role,
            praUserEntity.displayName,
            praUserEntity.businessUnit,
        );

        try {
            await this.praUserRepositoryService.createOrUpdateById(modifiedPraUserEntity);
            this.trySendUserForgotPasswordEmailAsync(
                command.transactionId,
                command.email,
                praUserEntity.displayName,
                newPassword,
            );
        } catch (error) {
            console.error(
                `Failed to process forgot password for user ${praUserEntity.id}:`,
                ErrorProcessorUtility.stringify(error),
            );
        }
    }

    private trySendUserForgotPasswordEmailAsync(
        transactionId: string,
        email: string,
        displayName: string,
        password: string,
    ): void {
        void this.commandBus
            .execute(new SendUserForgotPasswordEmailCommand(transactionId, email, displayName, password))
            .catch((error) => {
                console.error(
                    `Failed to send forgot password email to ${email}:`,
                    ErrorProcessorUtility.stringify(error),
                );
            });
    }
}
