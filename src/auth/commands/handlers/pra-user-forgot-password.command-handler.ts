import { NotFoundException } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import * as bcrypt from 'bcrypt';
import { ErrorProcessorUtility, PasswordGeneratorUtility } from '../../../shared/utilities';
import { SendPraUserNewPasswordEmailCommand } from '../../../email/commands';
import { PraUserEntity } from '../../repositories/entities';
import { PraUserRepositoryService } from '../../repositories/services/pra-user-repository.service';
import { PraUserForgotPasswordCommand } from '../pra-user-forgot-password.command';
import { PraUser } from '../../../auth/models';

@CommandHandler(PraUserForgotPasswordCommand)
export class PraUserForgotPasswordCommandHandler implements ICommandHandler<PraUserForgotPasswordCommand> {
    private static readonly SALT_ROUNDS = 10;

    constructor(
        private readonly commandBus: CommandBus,
        private readonly praUserRepositoryService: PraUserRepositoryService,
    ) {}

    public async execute(command: PraUserForgotPasswordCommand): Promise<void> {
        try {
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
                praUserEntity.canManagePraUsers,
            );

            await this.praUserRepositoryService.createOrUpdateById(modifiedPraUserEntity);

            if (newPassword) {
                this.trySendUserNewPasswordEmailAsync(
                    command.transactionId,
                    modifiedPraUserEntity as PraUser,
                    newPassword,
                );
            }
        } catch (error) {
            throw ErrorProcessorUtility.composeError(error);
        }
    }

    private trySendUserNewPasswordEmailAsync(transactionId: string, user: PraUser, password: string): void {
        void this.commandBus
            .execute(
                new SendPraUserNewPasswordEmailCommand(
                    transactionId,
                    user.email,
                    user.displayName,
                    user.username,
                    password,
                ),
            )
            .catch((error) => {
                console.error(
                    `Failed to send forgot password email to ${user.email}:`,
                    ErrorProcessorUtility.stringify(error),
                );
            });
    }
}
