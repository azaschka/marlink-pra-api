import { NotFoundException } from '@nestjs/common';
import { CommandBus, CommandHandler, EventBus, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { Customer } from '../../../customer/models';
import { RetrieveCustomersQuery } from '../../../customer/queries';
import { SiteModifiedEvent } from '../../events';
import { PartialSiteSupportTeamMember, Site } from '../../models';
import { SiteEntity } from '../../repositories/entities';
import { SiteRepositoryService } from '../../repositories/services/site-repository.service';
import { SiteSupportTeamMemberRepositoryService } from '../../repositories/services/site-support-team-member.service';
import { WorkflowFactory } from '../../workflows/factories';
import { RemoveSiteSupportTeamMemberCommand } from '../remove-site-support-team-member.command';

@CommandHandler(RemoveSiteSupportTeamMemberCommand)
export class RemoveSiteSupportTeamMemberCommandHandler implements ICommandHandler<RemoveSiteSupportTeamMemberCommand> {
    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
        private readonly eventBus: EventBus,
        private readonly siteRepositoryService: SiteRepositoryService,
        private readonly siteSupportTeamMemberRepositoryService: SiteSupportTeamMemberRepositoryService,
    ) {}

    public async execute(command: RemoveSiteSupportTeamMemberCommand): Promise<void> {
        const site = await this.getSite(command.siteId);
        const customer = await this.getCustomer(command.transactionId, site.customerKey);
        const siteSupportTeamMember = this.removeSiteSupportTeamMemberFromSite(site, command.siteSupportTeamMemberId);

        await this.runWorkflow(command.transactionId, customer, site, siteSupportTeamMember);
        await this.siteSupportTeamMemberRepositoryService.deleteById(siteSupportTeamMember.id);

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

    private removeSiteSupportTeamMemberFromSite(site: SiteEntity, siteSupportTeamMemberId: number) {
        const siteSupportTeamMember = site.siteSupportTeamMembers.find(
            (supportTeamMember) => supportTeamMember.id === siteSupportTeamMemberId,
        );

        if (!siteSupportTeamMember) {
            throw new NotFoundException(
                `Site support team member with ID "${siteSupportTeamMemberId}" does not exist.`,
            );
        }

        site.siteSupportTeamMembers = site.siteSupportTeamMembers.filter(
            (supportTeamMember) => supportTeamMember.id !== siteSupportTeamMember.id,
        );

        return siteSupportTeamMember;
    }

    private async runWorkflow(
        transactionId: string,
        customer: Customer,
        site: Site,
        siteSupportTeamMember: PartialSiteSupportTeamMember,
    ) {
        const workflow = WorkflowFactory.create(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            transactionId,
            customer,
            site,
        ).createSiteSupportTeamMemberWorkflow(siteSupportTeamMember);

        await workflow.delete();
    }
}
