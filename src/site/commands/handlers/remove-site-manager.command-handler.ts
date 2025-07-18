import { ConflictException, NotFoundException } from '@nestjs/common';
import { CommandBus, CommandHandler, EventBus, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { Customer } from '../../../customer/models';
import { RetrieveCustomersQuery } from '../../../customer/queries';
import { SiteModifiedEvent } from '../../events';
import { PartialSiteManager, Site } from '../../models';
import { SiteEntity } from '../../repositories/entities';
import { SiteManagerRepositoryService } from '../../repositories/services/site-manager.service';
import { SiteRepositoryService } from '../../repositories/services/site-repository.service';
import { WorkflowFactory } from '../../workflows/factories';
import { RemoveSiteManagerCommand } from '../remove-site-manager.command';

@CommandHandler(RemoveSiteManagerCommand)
export class RemoveSiteManagerCommandHandler implements ICommandHandler<RemoveSiteManagerCommand> {
    private static readonly MINIMUM_SITE_MANAGER_COUNT = 1;

    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
        private readonly eventBus: EventBus,
        private readonly siteRepositoryService: SiteRepositoryService,
        private readonly siteManagerRepositoryService: SiteManagerRepositoryService,
    ) {}

    public async execute(command: RemoveSiteManagerCommand): Promise<void> {
        const site = await this.getSite(command.siteId);
        const customer = await this.getCustomer(command.transactionId, site.customerKey);

        this.validateMinimumSiteManagerCount(site);

        const siteManager = this.removeSiteManagerFromSite(site, command.siteManagerId);

        await this.runWorkflow(command.transactionId, customer, site, siteManager);
        await this.siteManagerRepositoryService.deleteById(siteManager.id);

        const updatedSite = await this.getSite(command.siteId);
        this.eventBus.publish(new SiteModifiedEvent(command.transactionId, { site: updatedSite }));
    }

    private async getSite(siteId: number) {
        const site = await this.siteRepositoryService.findOneById(siteId);

        if (!site) {
            throw new NotFoundException(`Site with ID "${siteId}" does not exist.`);
        }

        return site;
    }

    private async getCustomer(transactionId: string, customerKey: string) {
        const customers = await this.queryBus.execute<RetrieveCustomersQuery, Customer[]>(
            new RetrieveCustomersQuery(transactionId, 1, 1, customerKey),
        );

        if (customers.length === 0 || !customers[0]) {
            throw new NotFoundException(`Customer with key "${customerKey}" does not exist.`);
        }

        return customers[0];
    }

    private validateMinimumSiteManagerCount(site: SiteEntity) {
        if (site.siteManagers.length <= RemoveSiteManagerCommandHandler.MINIMUM_SITE_MANAGER_COUNT) {
            throw new ConflictException(
                `Site must have at least ${RemoveSiteManagerCommandHandler.MINIMUM_SITE_MANAGER_COUNT} site manager.`,
            );
        }
    }

    private removeSiteManagerFromSite(site: SiteEntity, siteManagerId: number) {
        const siteManager = site.siteManagers.find((manager) => manager.id === siteManagerId);

        if (!siteManager) {
            throw new NotFoundException(`Site manager with ID "${siteManagerId}" does not exist.`);
        }

        site.siteManagers = site.siteManagers.filter((manager) => manager.id !== siteManager.id);

        return siteManager;
    }

    private async runWorkflow(transactionId: string, customer: Customer, site: Site, siteManager: PartialSiteManager) {
        const workflow = WorkflowFactory.create(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            transactionId,
            customer,
            site,
        ).createSiteManagerWorkflow(siteManager);

        await workflow.delete();
    }
}
