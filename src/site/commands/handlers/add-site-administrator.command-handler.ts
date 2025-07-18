import { ConflictException, NotFoundException } from '@nestjs/common';
import { CommandBus, CommandHandler, EventBus, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { Customer } from '../../../customer/models';
import { RetrieveCustomersQuery } from '../../../customer/queries';
import { ObjectUtility } from '../../../shared/utilities';
import { SiteModifiedEvent } from '../../events';
import { PartialSiteAdministrator, PartialSiteAdministratorWithUserId, Site, SiteAdministrator } from '../../models';
import { SiteAdministratorEntity } from '../../repositories/entities';
import { SiteAdministratorRepositoryService } from '../../repositories/services/site-administrator.service';
import { SiteRepositoryService } from '../../repositories/services/site-repository.service';
import { WorkflowFactory } from '../../workflows/factories';
import { AddSiteAdministratorCommand } from '../add-site-administrator.command';

@CommandHandler(AddSiteAdministratorCommand)
export class AddSiteAdministratorCommandHandler implements ICommandHandler<AddSiteAdministratorCommand> {
    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
        private readonly eventBus: EventBus,
        private readonly siteRepositoryService: SiteRepositoryService,
        private readonly siteAdministratorRepositoryService: SiteAdministratorRepositoryService,
    ) {}

    public async execute(command: AddSiteAdministratorCommand): Promise<SiteAdministrator> {
        const site = await this.retrieveSite(command.siteId);
        const customer = await this.retrieveCustomer(command.transactionId, site.customerKey);
        const siteAdministrator = await this.runWorkflow(command.transactionId, customer, site, {
            username: command.username,
            email: command.email,
            isAdminOperator: command.isAdminOperator,
        });

        this.validateSiteAdministratorHasNotAddedToSite(site, siteAdministrator);

        const createdSiteAdministrator = await this.siteAdministratorRepositoryService.create(
            SiteAdministratorEntity.createWithoutId(
                site.id,
                siteAdministrator.userId,
                siteAdministrator.username,
                siteAdministrator.email,
                siteAdministrator.isAdminOperator,
            ),
        );

        const updatedSite = await this.retrieveSite(command.siteId);
        this.eventBus.publish(new SiteModifiedEvent(command.transactionId, { site: updatedSite }));

        return createdSiteAdministrator;
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

        return await workflow.getOrCreate();
    }

    private validateSiteAdministratorHasNotAddedToSite(
        site: Site,
        siteAdministrator: PartialSiteAdministratorWithUserId,
    ) {
        if (
            ObjectUtility.contain(
                site.siteAdministrators.map(({ userId }) => userId),
                [siteAdministrator.userId],
            )
        ) {
            throw new ConflictException(
                `Site administrator with userId "${siteAdministrator.userId}" already exists for site with ID "${site.id}".`,
            );
        }
    }
}
