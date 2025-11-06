import { ConflictException, NotFoundException } from '@nestjs/common';
import { CommandBus, CommandHandler, EventBus, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { BusinessUnit } from '../../../customer/enums';
import { Customer } from '../../../customer/models';
import { RetrieveCustomersQuery } from '../../../customer/queries';
import { SiteCreatedEvent } from '../../events';
import {
    PartialSiteAdministrator,
    PartialSiteAdministratorWithUserId,
    PartialSiteApprover,
    PartialSiteManager,
    PartialSiteManagerWithUserId,
    PartialSiteSupportTeamMember,
    PartialSiteSupportTeamMemberWithUserId,
    Site,
    SiteWorkflowResult,
} from '../../models';
import { RetrieveSitesQuery } from '../../queries';
import { SiteEntity } from '../../repositories/entities';
import { SiteRepositoryService } from '../../repositories/services/site-repository.service';
import { SiteWorkflow } from '../../workflows';
import { CreateSiteCommand } from '../create-site.command';

@CommandHandler(CreateSiteCommand)
export class CreateSiteCommandHandler implements ICommandHandler<CreateSiteCommand> {
    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
        private readonly eventBus: EventBus,
        private readonly siteRepositoryService: SiteRepositoryService,
    ) {}

    public async execute(command: CreateSiteCommand): Promise<Site> {
        await this.validateSiteKeyAndName(command.transactionId, command.key, command.name);
        const customer = await this.getCustomer(command.transactionId, command.customerKey);
        const partialSiteApprovers = command.siteApproverEmails.map((email) => ({
            email,
        }));

        const siteWorkflowResult = await this.runWorkflow(
            command.transactionId,
            command.name,
            command.key,
            command.siteManagers,
            command.siteAdministrators,
            command.siteSupportTeamMembers,
            partialSiteApprovers,
            customer.name,
            customer.businessUnit,
            customer.beyondtrustInstanceId,
        );

        const createdSite = await this.createSite(
            command.key,
            command.name,
            command.customerKey,
            siteWorkflowResult.siteManagers,
            siteWorkflowResult.siteAdministrators,
            siteWorkflowResult.siteSupportTeamMembers,
            partialSiteApprovers,
        );

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

    private async getCustomer(transactionId: string, customerKey: string): Promise<Customer> {
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
        siteAdministrators: PartialSiteAdministrator[],
        siteSupportTeamMembers: PartialSiteSupportTeamMember[],
        siteApprovers: PartialSiteApprover[],
        customerName: string,
        customerBusinessUnit: BusinessUnit,
        customerBeyondTrustInstanceId: number,
    ): Promise<SiteWorkflowResult> {
        const siteWorkflow = new SiteWorkflow(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            transactionId,
            siteName,
            siteKey,
            siteManagers,
            siteAdministrators,
            siteSupportTeamMembers,
            siteApprovers,
            customerName,
            customerBusinessUnit,
            customerBeyondTrustInstanceId,
        );

        return await siteWorkflow.getOrCreate();
    }

    private async createSite(
        key: string,
        name: string,
        customerKey: string,
        managers: PartialSiteManagerWithUserId[],
        administrators: PartialSiteAdministratorWithUserId[],
        supportTeamMembers: PartialSiteSupportTeamMemberWithUserId[],
        approvers: PartialSiteApprover[],
    ) {
        const siteEntity = SiteEntity.createWithoutId(
            key,
            name,
            customerKey,
            managers,
            administrators,
            supportTeamMembers,
            approvers,
        );

        return await this.siteRepositoryService.create(siteEntity);
    }
}
