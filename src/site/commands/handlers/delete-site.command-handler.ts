import { NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { SiteDeletedEvent } from '../../events';
import { SiteRepositoryService } from '../../repositories/services/site-repository.service';
import { DeleteSiteCommand } from '../delete-site.command';

@CommandHandler(DeleteSiteCommand)
export class DeleteSiteCommandHandler implements ICommandHandler<DeleteSiteCommand> {
    constructor(
        private readonly eventBus: EventBus,
        private readonly siteRepositoryService: SiteRepositoryService,
    ) {}

    public async execute(command: DeleteSiteCommand): Promise<void> {
        const site = await this.siteRepositoryService.findOneById(command.id);

        if (!site) {
            throw new NotFoundException();
        }

        await this.siteRepositoryService.deleteById(command.id);

        this.eventBus.publish(new SiteDeletedEvent(command.transactionId, { id: command.id }));
    }
}
