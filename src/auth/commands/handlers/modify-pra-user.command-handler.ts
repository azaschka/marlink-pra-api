import { NotFoundException } from '@nestjs/common';
import { CommandBus, CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import * as bcrypt from 'bcrypt';
import { PraUserModifiedEvent } from '../../events';
import { PraUserEntity } from '../../repositories/entities';
import { PraUserRepositoryService } from '../../repositories/services/pra-user-repository.service';
import { ModifyPraUserCommand } from '../modify-pra-user.command';
import { PraUser } from '../../../auth/models';
import { ErrorProcessorUtility, PasswordGeneratorUtility } from '../../../shared/utilities';
import { SendPraUserNewPasswordEmailCommand } from '../../../email/commands';

@CommandHandler(ModifyPraUserCommand)
export class ModifyPraUserCommandHandler implements ICommandHandler<ModifyPraUserCommand> {
    private static readonly SALT_ROUNDS = 10;

    constructor(
        private readonly eventBus: EventBus,
        private readonly praUserRepositoryService: PraUserRepositoryService,
        private readonly commandBus: CommandBus,
    ) {}

    public async execute(command: ModifyPraUserCommand): Promise<PraUserEntity> {
        try {
            const praUserEntity = await this.praUserRepositoryService.findOneById(command.id);
            if (!praUserEntity) {
                throw new NotFoundException();
            }

            let userPassword: string | undefined = undefined;
            if (command.regeneratePassword) {
                userPassword = PasswordGeneratorUtility.generate();
            }

            const hashedPassword: string | undefined = userPassword
                ? await bcrypt.hash(userPassword, ModifyPraUserCommandHandler.SALT_ROUNDS)
                : undefined;
            const modifiedPraUserEntity = PraUserEntity.create(
                command.id,
                command.username ?? praUserEntity.username,
                hashedPassword ?? praUserEntity.password,
                command.email ?? praUserEntity.email,
                command.role ?? praUserEntity.role,
                command.displayName ?? praUserEntity.displayName,
                command.businessUnit ?? praUserEntity.businessUnit,
                command.canManagePraUsers ?? praUserEntity?.canManagePraUsers,
            );

            await this.praUserRepositoryService.createOrUpdateById(modifiedPraUserEntity);

            if (command.regeneratePassword && userPassword) {
                this.trySendUserNewPasswordEmailAsync(
                    command.transactionId,
                    modifiedPraUserEntity as PraUser,
                    userPassword,
                );
            }

            this.eventBus.publish(
                new PraUserModifiedEvent(command.transactionId, {
                    praUser: modifiedPraUserEntity,
                }),
            );

            return modifiedPraUserEntity;
        } catch (error) {
            throw ErrorProcessorUtility.composeError(error);
        }
    }

    private trySendUserNewPasswordEmailAsync(transactionId: string, user: PraUser, password: string): void {
        if (!user.email) {
            console.warn(`User with ID ${user.id} does not have an email address, skipping new password email.`);
            return;
        }

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
                    `Failed to send new password email for user ${user.username}:`,
                    ErrorProcessorUtility.stringify(error),
                );
            });
    }
}
