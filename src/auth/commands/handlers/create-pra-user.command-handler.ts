import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import * as bcrypt from 'bcrypt';
import { PraUserCreatedEvent } from '../../events';
import { PraUserEntity } from '../../repositories/entities';
import { PraUserRepositoryService } from 'src/auth/repositories/services/pra-user-repository.service';
import { CreatePraUserCommand } from '../create-pra-user.command';

@CommandHandler(CreatePraUserCommand)
export class CreatePraUserCommandHandler implements ICommandHandler<CreatePraUserCommand> {
    private static readonly SALT_ROUNDS = 10;

    constructor(
        private readonly eventBus: EventBus,
        private readonly praUserRepositoryService: PraUserRepositoryService,
    ) {}

    public async execute(command: CreatePraUserCommand): Promise<PraUserEntity> {
        const hashedPassword = await bcrypt.hash(command.password, CreatePraUserCommandHandler.SALT_ROUNDS);
        const praUserEntity = PraUserEntity.createWithoutId(
            command.username,
            hashedPassword,
            command.email,
            command.role,
            command.displayName,
            command.businessUnit,
        );
        const createdPraUser = await this.praUserRepositoryService.create(praUserEntity);

        this.eventBus.publish(
            new PraUserCreatedEvent(command.transactionId, {
                praUser: createdPraUser,
            }),
        );

        return createdPraUser;
    }
}
