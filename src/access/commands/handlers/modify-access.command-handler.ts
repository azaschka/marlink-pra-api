import { NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { AccessModifiedEvent } from '../../events';
import { Access } from '../../models';
import { AccessRepositoryService } from '../../repositories/services/access-repository.service';
import { ModifyAccessCommand } from '../modify-access.command';

@CommandHandler(ModifyAccessCommand)
export class ModifyAccessCommandHandler implements ICommandHandler<ModifyAccessCommand> {
    constructor(
        private readonly eventBus: EventBus,
        private readonly accessRepositoryService: AccessRepositoryService,
    ) {}

    public async execute(command: ModifyAccessCommand): Promise<Access> {
        const access = await this.accessRepositoryService.findOneById(command.id);

        if (!access) {
            throw new NotFoundException();
        }

        if (command.key) {
            access.key = command.key;
        }

        if (command.name) {
            access.name = command.name;
        }

        if (command.value) {
            access.value = command.value;
        }

        await this.accessRepositoryService.createOrUpdateById(access);

        this.eventBus.publish(new AccessModifiedEvent(command.transactionId, { access }));

        return access;
    }
}
