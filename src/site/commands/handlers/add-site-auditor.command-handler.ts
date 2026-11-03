import { ConflictException, NotFoundException } from '@nestjs/common';
import { CommandBus, CommandHandler, EventBus, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { Customer } from '../../../customer/models';
import { RetrieveCustomersQuery } from '../../../customer/queries';
import { ObjectUtility } from '../../../shared/utilities';
import { SiteUserType } from '../../enums';
import { SiteModifiedEvent } from '../../events';
import { PartialSiteAuditor, PartialSiteAuditorWithUserId, Site, SiteAuditor } from '../../models';
import { SiteAuditorEntity } from '../../repositories/entities';
import { SiteAuditorRepositoryService } from '../../repositories/services/site-auditor.service';
import { SiteRepositoryService } from '../../repositories/services/site-repository.service';
import { WorkflowFactory } from '../../workflows/factories';
import { AddSiteAuditorCommand } from '../add-site-auditor.command';

@CommandHandler(AddSiteAuditorCommand)
export class AddSiteAuditorCommandHandler implements ICommandHandler<AddSiteAuditorCommand> {
    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
        private readonly eventBus: EventBus,
        private readonly siteRepositoryService: SiteRepositoryService,
        private readonly siteAuditorRepositoryService: SiteAuditorRepositoryService,
    ) {}

    public async execute(command: AddSiteAuditorCommand): Promise<SiteAuditor> {
        const site = await this.getSite(command.siteId);
        const customer = await this.getCustomer(command.transactionId, site.customerKey);
        const siteAuditor = await this.runWorkflow(command.transactionId, customer, site, {
            username: command.username,
            email: command.email,
            isAdminOperator: command.isAdminOperator,
            sourceType: command.sourceType,
        });

        this.validateSiteAuditorHasNotAddedToSite(site, siteAuditor);

        const createdSiteAuditor = await this.siteAuditorRepositoryService.create(
            SiteAuditorEntity.createWithoutId(
                site.id,
                siteAuditor.userId,
                siteAuditor.sourceType,
                siteAuditor.username,
                siteAuditor.email,
                siteAuditor.isAdminOperator,
            ),
        );

        const updatedSite = await this.getSite(command.siteId);
        this.eventBus.publish(new SiteModifiedEvent(command.transactionId, { site: updatedSite }));

        return createdSiteAuditor;
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

    private async runWorkflow(transactionId: string, customer: Customer, site: Site, siteAuditor: PartialSiteAuditor) {
        const workflowFactory = WorkflowFactory.create(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            transactionId,
            customer,
            site,
        );
        const siteUser = await workflowFactory.createSiteAuditorWorkflow(siteAuditor).getOrCreate();

        // EXT-25: the role is in place, so the user leaves the SAML default policy of the Business Unit. A failure fails
        // this request, as a failed role policy does, and the next attempt repeats the idempotent steps.
        await workflowFactory.createBuSamlDefaultGroupPolicyWorkflow().removeFrom(SiteUserType.SiteAuditor, siteUser);

        return siteUser;
    }

    private validateSiteAuditorHasNotAddedToSite(site: Site, siteAuditor: PartialSiteAuditorWithUserId) {
        if (
            ObjectUtility.contain(
                site.siteAuditors.map(({ userId }) => userId),
                [siteAuditor.userId],
            )
        ) {
            throw new ConflictException(
                `Site auditor with userId "${siteAuditor.userId}" already exists for site with ID "${site.id}".`,
            );
        }
    }
}
