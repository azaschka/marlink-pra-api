import { ConflictException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { AccessCreatedEvent } from '../../events';
import { Access } from '../../models';
import { AccessEntity } from '../../repositories/entities';
import { AccessRepositoryService } from '../../repositories/services/access-repository.service';
import { CreateAccessCommand } from '../create-access.command';

@CommandHandler(CreateAccessCommand)
export class CreateAccessCommandHandler implements ICommandHandler<CreateAccessCommand> {
    constructor(
        private readonly eventBus: EventBus,
        private readonly accessRepositoryService: AccessRepositoryService,
    ) {}

    public async execute(command: CreateAccessCommand): Promise<Access> {
        await this.validateAccessKey(command.key);

        const access = await this.accessRepositoryService.create(
            AccessEntity.createWithoutId(command.key, command.name, command.value),
        );

        this.eventBus.publish(new AccessCreatedEvent(command.transactionId, { access }));

        return access;
    }

    private async validateAccessKey(key: string): Promise<void> {
        const access = await this.accessRepositoryService.findOneBy({ key });

        if (access) {
            throw new ConflictException(`Access with key "${key}" already exists.`);
        }
    }
}
