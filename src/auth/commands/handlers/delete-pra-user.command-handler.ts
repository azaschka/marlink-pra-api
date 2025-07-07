import { NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { PraUserRepositoryService } from '../../repositories/services/pra-user-repository.service';
import { PraUserDeletedEvent } from '../../events';
import { DeletePraUserCommand } from '../delete-pra-user.command';

@CommandHandler(DeletePraUserCommand)
export class DeletePraUserCommandHandler implements ICommandHandler<DeletePraUserCommand> {
    constructor(
        private readonly eventBus: EventBus,
        private readonly praUserRepositoryService: PraUserRepositoryService,
    ) {}

    public async execute(command: DeletePraUserCommand): Promise<void> {
        const praUserEntity = await this.praUserRepositoryService.findOneById(command.id);
        if (!praUserEntity) {
            throw new NotFoundException();
        }

        await this.praUserRepositoryService.deleteById(command.id);

        this.eventBus.publish(
            new PraUserDeletedEvent(command.transactionId, {
                id: command.id,
            }),
        );
    }
}
