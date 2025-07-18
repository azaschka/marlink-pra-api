import { ConflictException, NotFoundException } from '@nestjs/common';
import { CommandBus, CommandHandler, EventBus, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { Customer } from '../../../customer/models';
import { RetrieveCustomersQuery } from '../../../customer/queries';
import { ObjectUtility } from '../../../shared/utilities';
import { SiteModifiedEvent } from '../../events';
import {
    PartialSiteSupportTeamMember,
    PartialSiteSupportTeamMemberWithUserId,
    Site,
    SiteSupportTeamMember,
} from '../../models';
import { SiteSupportTeamMemberEntity } from '../../repositories/entities';
import { SiteRepositoryService } from '../../repositories/services/site-repository.service';
import { SiteSupportTeamMemberRepositoryService } from '../../repositories/services/site-support-team-member.service';
import { WorkflowFactory } from '../../workflows/factories';
import { AddSiteSupportTeamMemberCommand } from '../add-site-support-team-member.command';

@CommandHandler(AddSiteSupportTeamMemberCommand)
export class AddSiteSupportTeamMemberCommandHandler implements ICommandHandler<AddSiteSupportTeamMemberCommand> {
    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
        private readonly eventBus: EventBus,
        private readonly siteRepositoryService: SiteRepositoryService,
        private readonly siteSupportTeamMemberRepositoryService: SiteSupportTeamMemberRepositoryService,
    ) {}

    public async execute(command: AddSiteSupportTeamMemberCommand): Promise<SiteSupportTeamMember> {
        const site = await this.retrieveSite(command.siteId);
        const customer = await this.retrieveCustomer(command.transactionId, site.customerKey);
        const siteSupportTeamMember = await this.runWorkflow(command.transactionId, customer, site, {
            firstname: command.firstname,
            lastname: command.lastname,
            email: command.email,
            supportTeamName: command.supportTeamName,
            supportTeamAccessLevel: command.supportTeamAccessLevel,
            supportTeamTrustLevel: command.supportTeamTrustLevel,
        });

        this.validateSiteSupportTeamMemberHasNotAddedToSite(site, siteSupportTeamMember);

        const createdSiteSupportTeamMember = await this.siteSupportTeamMemberRepositoryService.create(
            SiteSupportTeamMemberEntity.createWithoutId(
                site.id,
                siteSupportTeamMember.userId,
                siteSupportTeamMember.firstname,
                siteSupportTeamMember.lastname,
                siteSupportTeamMember.email,
                siteSupportTeamMember.supportTeamName,
                siteSupportTeamMember.supportTeamAccessLevel,
                siteSupportTeamMember.supportTeamTrustLevel,
            ),
        );

        const updatedSite = await this.retrieveSite(command.siteId);
        this.eventBus.publish(new SiteModifiedEvent(command.transactionId, { site: updatedSite }));

        return createdSiteSupportTeamMember;
    }

    private async retrieveSite(siteId: number) {
        const site = await this.siteRepositoryService.findOneById(siteId);

        if (!site) {
            throw new NotFoundException(`Site with ID "${siteId}" does not exist.`);
        }

        return site;
    }

    private async retrieveCustomer(transactionId: string, customerKey: string) {
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

        return await workflow.getOrCreate();
    }

    private validateSiteSupportTeamMemberHasNotAddedToSite(
        site: Site,
        siteSupportTeamMember: PartialSiteSupportTeamMemberWithUserId,
    ) {
        if (
            ObjectUtility.contain(
                site.siteSupportTeamMembers.map(({ userId }) => userId),
                [siteSupportTeamMember.userId],
            )
        ) {
            throw new ConflictException(
                `Site support team member with userId "${siteSupportTeamMember.userId}" already exists for site with ID "${site.id}".`,
            );
        }
    }
}
