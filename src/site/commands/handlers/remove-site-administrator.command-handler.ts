import { NotFoundException } from '@nestjs/common';
import { CommandBus, CommandHandler, EventBus, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { Customer } from '../../../customer/models';
import { RetrieveCustomersQuery } from '../../../customer/queries';
import { SiteModifiedEvent } from '../../events';
import { PartialSiteAdministrator, Site } from '../../models';
import { SiteEntity } from '../../repositories/entities';
import { SiteAdministratorRepositoryService } from '../../repositories/services/site-administrator.service';
import { SiteRepositoryService } from '../../repositories/services/site-repository.service';
import { WorkflowFactory } from '../../workflows/factories';
import { RemoveSiteAdministratorCommand } from '../remove-site-administrator.command';

@CommandHandler(RemoveSiteAdministratorCommand)
export class RemoveSiteAdministratorCommandHandler implements ICommandHandler<RemoveSiteAdministratorCommand> {
    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
        private readonly eventBus: EventBus,
        private readonly siteRepositoryService: SiteRepositoryService,
        private readonly siteAdministratorRepositoryService: SiteAdministratorRepositoryService,
    ) {}

    public async execute(command: RemoveSiteAdministratorCommand): Promise<void> {
        const site = await this.getSite(command.siteId);
        const customer = await this.getCustomer(command.transactionId, site.customerKey);
        const siteAdministrator = this.removeSiteAdministratorFromSite(site, command.siteAdministratorId);

        await this.runWorkflow(command.transactionId, customer, site, siteAdministrator);
        await this.siteAdministratorRepositoryService.deleteById(siteAdministrator.id);

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

    private removeSiteAdministratorFromSite(site: SiteEntity, siteAdministratorId: number) {
        const siteAdministrator = site.siteAdministrators.find(
            (administrator) => administrator.id === siteAdministratorId,
        );

        if (!siteAdministrator) {
            throw new NotFoundException(`Site administrator with ID "${siteAdministratorId}" does not exist.`);
        }

        site.siteAdministrators = site.siteAdministrators.filter(
            (administrator) => administrator.id !== siteAdministrator.id,
        );

        return siteAdministrator;
    }

    private async runWorkflow(
        transactionId: string,
        customer: Customer,
        site: Site,
        siteAdministrator: PartialSiteAdministrator,
    ) {
        const workflow = WorkflowFactory.create(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            transactionId,
            customer,
            site,
        ).createSiteAdministratorWorkflow(siteAdministrator);

        await workflow.delete();
    }
}
