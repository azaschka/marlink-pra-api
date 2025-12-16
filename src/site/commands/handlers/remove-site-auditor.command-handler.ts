import { NotFoundException } from '@nestjs/common';
import { CommandBus, CommandHandler, EventBus, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { Customer } from '../../../customer/models';
import { RetrieveCustomersQuery } from '../../../customer/queries';
import { SiteModifiedEvent } from '../../events';
import { PartialSiteAuditor, Site } from '../../models';
import { SiteEntity } from '../../repositories/entities';
import { SiteAuditorRepositoryService } from '../../repositories/services/site-auditor.service';
import { SiteRepositoryService } from '../../repositories/services/site-repository.service';
import { WorkflowFactory } from '../../workflows/factories';
import { RemoveSiteAuditorCommand } from '../remove-site-auditor.command';

@CommandHandler(RemoveSiteAuditorCommand)
export class RemoveSiteAuditorCommandHandler implements ICommandHandler<RemoveSiteAuditorCommand> {
    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
        private readonly eventBus: EventBus,
        private readonly siteRepositoryService: SiteRepositoryService,
        private readonly siteAuditorRepositoryService: SiteAuditorRepositoryService,
    ) {}

    public async execute(command: RemoveSiteAuditorCommand): Promise<void> {
        const site = await this.getSite(command.siteId);
        const customer = await this.getCustomer(command.transactionId, site.customerKey);
        const siteAuditor = this.removeSiteAuditorFromSite(site, command.siteAuditorId);

        await this.runWorkflow(command.transactionId, customer, site, siteAuditor);
        await this.siteAuditorRepositoryService.deleteById(siteAuditor.id);

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

    private removeSiteAuditorFromSite(site: SiteEntity, siteAuditorId: number) {
        const siteAuditor = site.siteAuditors.find((auditor) => auditor.id === siteAuditorId);

        if (!siteAuditor) {
            throw new NotFoundException(`Site auditor with ID "${siteAuditorId}" does not exist.`);
        }

        site.siteAuditors = site.siteAuditors.filter((auditor) => auditor.id !== siteAuditor.id);

        return siteAuditor;
    }

    private async runWorkflow(transactionId: string, customer: Customer, site: Site, siteAuditor: PartialSiteAuditor) {
        const workflow = WorkflowFactory.create(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            transactionId,
            customer,
            site,
        ).createSiteAuditorWorkflow(siteAuditor);

        await workflow.delete();
    }
}
