import { NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { AccessDeletedEvent } from '../../events';
import { AccessRepositoryService } from '../../repositories/services/access-repository.service';
import { DeleteAccessCommand } from '../delete-access.command';

@CommandHandler(DeleteAccessCommand)
export class DeleteAccessCommandHandler implements ICommandHandler<DeleteAccessCommand> {
    constructor(
        private readonly eventBus: EventBus,
        private readonly accessRepositoryService: AccessRepositoryService,
    ) {}
    public async execute(command: DeleteAccessCommand): Promise<void> {
        const access = await this.accessRepositoryService.findOneById(command.id);

        if (!access) {
            throw new NotFoundException();
        }

        await this.accessRepositoryService.deleteById(command.id);

        this.eventBus.publish(new AccessDeletedEvent(command.transactionId, { id: command.id }));
    }
}
