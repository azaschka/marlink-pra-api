import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { SiteCreatedEvent } from '../../events';
import { Site } from '../../models';
import { SiteEntity } from '../../repositories/entities';
import { SiteRepositoryService } from '../../repositories/services/site-repository.service';
import { CreateSiteCommand } from '../create-site.command';

@CommandHandler(CreateSiteCommand)
export class CreateSiteCommandHandler implements ICommandHandler<CreateSiteCommand> {
    constructor(
        private readonly eventBus: EventBus,
        private readonly siteRepositoryService: SiteRepositoryService,
    ) {}

    public async execute(command: CreateSiteCommand): Promise<Site> {
        const siteEntity = SiteEntity.createWithoutId(
            command.key,
            command.name,
            command.customerKey,
            command.customerName,
            command.approverUsername,
            command.approverEmail,
        );
        const createdSite = await this.siteRepositoryService.create(siteEntity);

        this.eventBus.publish(
            new SiteCreatedEvent(command.transactionId, {
                site: createdSite,
            }),
        );

        return createdSite;
    }
}
