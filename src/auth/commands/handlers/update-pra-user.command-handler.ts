import { NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import * as bcrypt from 'bcrypt';
import { PraUserUpdatedEvent } from '../../events';
import { PraUser } from '../../models';
import { PraUserEntity } from '../../repositories/entities';
import { PraUserRepositoryService } from '../../repositories/services/pra-user-repository.service';
import { UpdatePraUserCommand } from '../update-pra-user.command';

@CommandHandler(UpdatePraUserCommand)
export class UpdatePraUserCommandHandler implements ICommandHandler<UpdatePraUserCommand> {
    private static readonly SALT_ROUNDS = 10;

    constructor(
        private readonly eventBus: EventBus,
        private readonly praUserRepositoryService: PraUserRepositoryService,
    ) {}

    public async execute(command: UpdatePraUserCommand): Promise<PraUser> {
        const praUserEntity = await this.praUserRepositoryService.findOneById(command.id);
        if (!praUserEntity) {
            throw new NotFoundException();
        }

        const hashedPassword: string | undefined = command.password
            ? await bcrypt.hash(command.password, UpdatePraUserCommandHandler.SALT_ROUNDS)
            : undefined;
        const updatedPraUserEntity = PraUserEntity.create(
            command.id,
            command.username ?? praUserEntity.username,
            hashedPassword ?? praUserEntity.password,
            command.email ?? praUserEntity.email,
            command.role ?? praUserEntity.role,
            command.displayName ?? praUserEntity.displayName,
        );

        await this.praUserRepositoryService.createOrUpdateById(updatedPraUserEntity);

        this.eventBus.publish(
            new PraUserUpdatedEvent(command.transactionId, {
                praUser: updatedPraUserEntity,
            }),
        );

        return updatedPraUserEntity;
    }
}
