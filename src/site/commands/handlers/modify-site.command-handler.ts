import { NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { SiteModifiedEvent } from '../../events';
import { Site } from '../../models';
import { SiteEntity } from '../../repositories/entities';
import { SiteRepositoryService } from '../../repositories/services/site-repository.service';
import { ModifySiteCommand } from '../modify-site.command';

@CommandHandler(ModifySiteCommand)
export class ModifySiteCommandHandler implements ICommandHandler<ModifySiteCommand> {
    constructor(
        private readonly eventBus: EventBus,
        private readonly siteRepositoryService: SiteRepositoryService,
    ) {}

    public async execute(command: ModifySiteCommand): Promise<Site> {
        const siteEntity = await this.siteRepositoryService.findOneById(command.id);

        if (!siteEntity) {
            throw new NotFoundException();
        }

        const modifiedSiteEntity = SiteEntity.create(
            siteEntity.id,
            siteEntity.key,
            siteEntity.name,
            siteEntity.customerKey,
            command.approvers ?? siteEntity.approvers,
        );

        await this.siteRepositoryService.createOrUpdateById(modifiedSiteEntity);

        this.eventBus.publish(
            new SiteModifiedEvent(command.transactionId, {
                site: modifiedSiteEntity,
            }),
        );

        return modifiedSiteEntity;
    }
}
