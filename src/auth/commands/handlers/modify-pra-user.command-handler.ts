import { NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import * as bcrypt from 'bcrypt';
import { PraUserModifiedEvent } from '../../events';
import { PraUserEntity } from '../../repositories/entities';
import { PraUserRepositoryService } from '../../repositories/services/pra-user-repository.service';
import { ModifyPraUserCommand } from '../modify-pra-user.command';

@CommandHandler(ModifyPraUserCommand)
export class ModifyPraUserCommandHandler implements ICommandHandler<ModifyPraUserCommand> {
    private static readonly SALT_ROUNDS = 10;

    constructor(
        private readonly eventBus: EventBus,
        private readonly praUserRepositoryService: PraUserRepositoryService,
    ) {}

    public async execute(command: ModifyPraUserCommand): Promise<PraUserEntity> {
        const praUserEntity = await this.praUserRepositoryService.findOneById(command.id);
        if (!praUserEntity) {
            throw new NotFoundException();
        }

        const hashedPassword: string | undefined = command.password
            ? await bcrypt.hash(command.password, ModifyPraUserCommandHandler.SALT_ROUNDS)
            : undefined;
        const modifiedPraUserEntity = PraUserEntity.create(
            command.id,
            command.username ?? praUserEntity.username,
            hashedPassword ?? praUserEntity.password,
            command.email ?? praUserEntity.email,
            command.role ?? praUserEntity.role,
            command.displayName ?? praUserEntity.displayName,
            command.businessUnit ?? praUserEntity.businessUnit,
        );

        await this.praUserRepositoryService.createOrUpdateById(modifiedPraUserEntity);

        this.eventBus.publish(
            new PraUserModifiedEvent(command.transactionId, {
                praUser: modifiedPraUserEntity,
            }),
        );

        return modifiedPraUserEntity;
    }
}
