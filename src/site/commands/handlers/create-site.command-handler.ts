import { ConflictException, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { Customer } from '../../../customer/models';
import { RetrieveCustomersQuery } from '../../../customer/queries';
import { SiteCreatedEvent } from '../../events';
import { Site } from '../../models';
import { RetrieveSitesQuery } from '../../queries';
import { SiteEntity } from '../../repositories/entities';
import { SiteRepositoryService } from '../../repositories/services/site-repository.service';
import { CreateSiteCommand } from '../create-site.command';

@CommandHandler(CreateSiteCommand)
export class CreateSiteCommandHandler implements ICommandHandler<CreateSiteCommand> {
    constructor(
        private readonly queryBus: QueryBus,
        private readonly eventBus: EventBus,
        private readonly siteRepositoryService: SiteRepositoryService,
    ) {}

    public async execute(command: CreateSiteCommand): Promise<Site> {
        await this.validateSiteKeyAndName(command.transactionId, command.key, command.name);
        await this.validateCustomerExist(command.transactionId, command.customerKey);

        const siteEntity = SiteEntity.createWithoutId(
            command.key,
            command.name,
            command.customerKey,
            command.approvers,
        );
        const createdSite = await this.siteRepositoryService.create(siteEntity);

        this.eventBus.publish(
            new SiteCreatedEvent(command.transactionId, {
                site: createdSite,
            }),
        );

        return createdSite;
    }

    private async validateSiteKeyAndName(transactionId: string, key: string, name: string): Promise<void> {
        const sitesWithSameKey = await this.queryBus.execute<RetrieveSitesQuery, Site[]>(
            new RetrieveSitesQuery(transactionId, 1, 1, key, undefined),
        );

        if (sitesWithSameKey.length > 0) {
            throw new ConflictException(`Site with key "${key}" already exists.`);
        }

        const sitesWithMatchingName = await this.queryBus.execute<RetrieveSitesQuery, Site[]>(
            new RetrieveSitesQuery(transactionId, 1, 1, undefined, undefined, undefined, `%${name}%`),
        );

        if (sitesWithMatchingName.length > 0) {
            throw new ConflictException(`Site with matching the name "${name}" already exists.`);
        }
    }

    private async validateCustomerExist(transactionId: string, customerKey: string): Promise<void> {
        const customers = await this.queryBus.execute<RetrieveCustomersQuery, Customer[]>(
            new RetrieveCustomersQuery(transactionId, 1, 1, customerKey),
        );

        if (customers.length === 0) {
            throw new NotFoundException(`Customer with key "${customerKey}" does not exist.`);
        }
    }
}
