import { ConflictException, NotFoundException } from '@nestjs/common';
import { CommandBus, CommandHandler, EventBus, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { Customer } from '../../../customer/models';
import { RetrieveCustomersQuery } from '../../../customer/queries';
import { ObjectUtility } from '../../../shared/utilities';
import { SiteModifiedEvent } from '../../events';
import { PartialSiteManager, PartialSiteManagerWithUserId, Site, SiteManager } from '../../models';
import { SiteManagerEntity } from '../../repositories/entities';
import { SiteManagerRepositoryService } from '../../repositories/services/site-manager.service';
import { SiteRepositoryService } from '../../repositories/services/site-repository.service';
import { WorkflowFactory } from '../../workflows/factories';
import { AddSiteManagerCommand } from '../add-site-manager.command';

@CommandHandler(AddSiteManagerCommand)
export class AddSiteManagerCommandHandler implements ICommandHandler<AddSiteManagerCommand> {
    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
        private readonly eventBus: EventBus,
        private readonly siteRepositoryService: SiteRepositoryService,
        private readonly siteManagerRepositoryService: SiteManagerRepositoryService,
    ) {}

    public async execute(command: AddSiteManagerCommand): Promise<SiteManager> {
        const site = await this.getSite(command.siteId);
        const customer = await this.getCustomer(command.transactionId, site.customerKey);
        const siteManager = await this.runWorkflow(command.transactionId, customer, site, {
            username: command.username,
            email: command.email,
            sourceType: command.sourceType,
        });

        this.validateSiteManagerHasNotAddedToSite(site, siteManager);

        const createdSiteManager = await this.siteManagerRepositoryService.create(
            SiteManagerEntity.createWithoutId(
                site.id,
                siteManager.userId,
                siteManager.sourceType,
                siteManager.username,
                siteManager.email,
            ),
        );

        const updatedSite = await this.getSite(command.siteId);
        this.eventBus.publish(new SiteModifiedEvent(command.transactionId, { site: updatedSite }));

        return createdSiteManager;
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

    private async runWorkflow(transactionId: string, customer: Customer, site: Site, siteManager: PartialSiteManager) {
        const workflow = WorkflowFactory.create(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            transactionId,
            customer,
            site,
        ).createSiteManagerWorkflow(siteManager);

        return await workflow.getOrCreate();
    }

    private validateSiteManagerHasNotAddedToSite(site: Site, siteManager: PartialSiteManagerWithUserId) {
        if (
            ObjectUtility.contain(
                site.siteManagers.map(({ userId }) => userId),
                [siteManager.userId],
            )
        ) {
            throw new ConflictException(
                `Site manager with userId "${siteManager.userId}" already exists for site with ID "${site.id}".`,
            );
        }
    }
}
