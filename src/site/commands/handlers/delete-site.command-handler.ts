import { NotFoundException } from '@nestjs/common';
import { CommandBus, CommandHandler, EventBus, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { BusinessUnit } from '../../../beyondtrust-instance/enums';
import { Customer } from '../../../customer/models';
import { RetrieveCustomersQuery } from '../../../customer/queries';
import { SiteDeletedEvent } from '../../events';
import {
    PartialSiteApprover,
    PartialSiteAuditor,
    PartialSiteManager,
    PartialSiteSupportTeamMember,
} from '../../models';
import { SiteRepositoryService } from '../../repositories/services/site-repository.service';
import { SiteWorkflow } from '../../workflows';
import { DeleteSiteCommand } from '../delete-site.command';

@CommandHandler(DeleteSiteCommand)
export class DeleteSiteCommandHandler implements ICommandHandler<DeleteSiteCommand> {
    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
        private readonly eventBus: EventBus,
        private readonly siteRepositoryService: SiteRepositoryService,
    ) {}

    public async execute(command: DeleteSiteCommand): Promise<void> {
        const site = await this.getSite(command.id);
        const customer = await this.getCustomer(command.transactionId, site.customerKey);

        await this.runWorkflow(
            command.transactionId,
            site.name,
            site.key,
            site.siteManagers as PartialSiteManager[],
            site.siteAuditors as PartialSiteAuditor[],
            site.siteSupportTeamMembers as PartialSiteSupportTeamMember[],
            site.siteApprovers as PartialSiteApprover[],
            customer.name,
            customer.beyondtrustInstance.businessUnit,
            customer.beyondtrustInstanceId,
        );
        await this.siteRepositoryService.deleteById(command.id);

        this.eventBus.publish(new SiteDeletedEvent(command.transactionId, { id: command.id }));
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

    private async runWorkflow(
        transactionId: string,
        siteName: string,
        siteKey: string,
        siteManagers: PartialSiteManager[],
        siteAuditors: PartialSiteAuditor[],
        siteSupportTeamMembers: PartialSiteSupportTeamMember[],
        siteApprovers: PartialSiteApprover[],
        customerName: string,
        customerBusinessUnit: BusinessUnit,
        customerBeyondTrustInstanceId: number,
    ): Promise<void> {
        const siteWorkflow = new SiteWorkflow(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            transactionId,
            siteName,
            siteKey,
            siteManagers,
            siteAuditors,
            siteSupportTeamMembers,
            siteApprovers,
            customerName,
            customerBusinessUnit,
            customerBeyondTrustInstanceId,
        );

        await siteWorkflow.delete();
    }
}
