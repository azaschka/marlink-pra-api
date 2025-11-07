import { CommandBus, CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import * as bcrypt from 'bcrypt';
import { PraUserCreatedEvent } from '../../events';
import { PraUserEntity } from '../../repositories/entities';
import { PraUser } from '../../../auth/models';
import { PraUserRepositoryService } from '../../../auth/repositories/services/pra-user-repository.service';
import { CreatePraUserCommand } from '../create-pra-user.command';
import { ErrorProcessorUtility, PasswordGeneratorUtility } from '../../../shared/utilities';
import { SendPraUserActivationEmailCommand } from '../../../email/commands';

@CommandHandler(CreatePraUserCommand)
export class CreatePraUserCommandHandler implements ICommandHandler<CreatePraUserCommand> {
    private static readonly SALT_ROUNDS = 10;

    constructor(
        private readonly eventBus: EventBus,
        private readonly praUserRepositoryService: PraUserRepositoryService,
        private readonly commandBus: CommandBus,
    ) {}

    public async execute(command: CreatePraUserCommand): Promise<PraUserEntity> {
        try {
            const userPassword = command.password ? command.password : PasswordGeneratorUtility.generate();
            const hashedPassword = await bcrypt.hash(userPassword, CreatePraUserCommandHandler.SALT_ROUNDS);
            const praUserEntity = PraUserEntity.createWithoutId(
                command.username,
                hashedPassword,
                command.email,
                command.role,
                command.displayName,
                command.businessUnit,
                command.canManagePraUsers,
            );
            const createdPraUser = await this.praUserRepositoryService.create(praUserEntity);

            if (createdPraUser) {
                this.trySendUserActivationEmailAsync(command.transactionId, createdPraUser as PraUser, userPassword);
            }

            this.eventBus.publish(
                new PraUserCreatedEvent(command.transactionId, {
                    praUser: createdPraUser,
                }),
            );

            return createdPraUser;
        } catch (error) {
            throw ErrorProcessorUtility.composeError(error);
        }
    }

    private trySendUserActivationEmailAsync(transactionId: string, user: PraUser, password: string): void {
        if (!user.email) {
            console.warn(`PRA User with ID ${user.id} does not have an email address, skipping activation email.`);
            return;
        }

        void this.commandBus
            .execute(
                new SendPraUserActivationEmailCommand(
                    transactionId,
                    user.email,
                    user.displayName,
                    user.username,
                    password,
                    user.role,
                ),
            )
            .catch((error) => {
                console.error(
                    `Failed to send activation email for user ${user.username}:`,
                    ErrorProcessorUtility.stringify(error),
                );
            });
    }
}
