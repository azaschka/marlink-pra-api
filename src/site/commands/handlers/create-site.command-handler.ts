import { ConflictException, NotFoundException } from '@nestjs/common';
import { CommandBus, CommandHandler, EventBus, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { BusinessUnit } from '../../../beyondtrust-instance/enums';
import { Customer } from '../../../customer/models';
import { RetrieveCustomersQuery } from '../../../customer/queries';
import { SiteCreatedEvent, SiteModifiedEvent } from '../../events';
import {
    PartialSiteApprover,
    PartialSiteAuditor,
    PartialSiteAuditorWithUserId,
    PartialSiteManager,
    PartialSiteManagerWithUserId,
    PartialSiteSupportTeamMember,
    PartialSiteSupportTeamMemberWithUserId,
    Site,
    SiteWorkflowResult,
} from '../../models';
import { RetrieveSiteByIdQuery, RetrieveSitesQuery } from '../../queries';
import { SiteApproverEntity, SiteAuditorEntity, SiteEntity, SiteManagerEntity } from '../../repositories/entities';
import { SiteApproverRepositoryService } from '../../repositories/services/site-approver.service';
import { SiteAuditorRepositoryService } from '../../repositories/services/site-auditor.service';
import { SiteManagerRepositoryService } from '../../repositories/services/site-manager.service';
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
        private readonly siteManagerRepositoryService: SiteManagerRepositoryService,
        private readonly siteAuditorRepositoryService: SiteAuditorRepositoryService,
        private readonly siteApproverRepositoryService: SiteApproverRepositoryService,
    ) {}

    public async execute(command: CreateSiteCommand): Promise<Site> {
        const existingSite = await this.getSiteByKey(command.transactionId, command.key);

        // For new sites only: fail fast before any BeyondTrust calls.
        if (existingSite === null) {
            await this.validateSiteNameNotTaken(command.transactionId, command.name);
        }

        const customer = await this.getCustomer(command.transactionId, command.customerKey);
        const partialSiteApprovers = command.siteApproverEmails.map((email) => ({ email }));

        // SiteWorkflow.getOrCreate() is fully idempotent: it creates BeyondTrust
        // users/group-policies/jump-policies only if they don't exist yet.
        const siteWorkflowResult = await this.runWorkflow(
            command.transactionId,
            command.name,
            command.key,
            command.siteManagers,
            command.siteAuditors,
            command.siteSupportTeamMembers,
            partialSiteApprovers,
            customer.name,
            customer.businessUnit,
            customer.beyondtrustInstanceId,
        );

        if (existingSite === null) {
            // ── New site path ────────────────────────────────────────────────
            const createdSite = await this.createSite(
                command.key,
                command.name,
                command.customerKey,
                siteWorkflowResult.siteManagers,
                siteWorkflowResult.siteAuditors,
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

        // ── Existing site path (re-ingestion) ────────────────────────────────
        // Persist only the members that are not already recorded in the DB so
        // that repeated ingestion runs are safe to call multiple times.
        await this.syncNewManagers(existingSite, siteWorkflowResult.siteManagers);
        await this.syncNewAuditors(existingSite, siteWorkflowResult.siteAuditors);
        await this.syncNewApprovers(existingSite, partialSiteApprovers);

        const updatedSite = await this.getSiteById(command.transactionId, existingSite.id);

        this.eventBus.publish(
            new SiteModifiedEvent(command.transactionId, {
                site: updatedSite,
            }),
        );

        return updatedSite;
    }

    // ── Private query helpers ────────────────────────────────────────────────

    /** Returns the site matching the given key, or null if it does not exist. */
    private async getSiteByKey(transactionId: string, key: string): Promise<Site | null> {
        const sites = await this.queryBus.execute<RetrieveSitesQuery, Site[]>(
            new RetrieveSitesQuery(transactionId, 1, 1, key, undefined),
        );

        return sites[0] ?? null;
    }

    /** Re-fetches a site by its database ID (used after partial updates). */
    private async getSiteById(transactionId: string, siteId: number): Promise<Site> {
        return await this.queryBus.execute<RetrieveSiteByIdQuery, Site>(
            new RetrieveSiteByIdQuery(transactionId, siteId),
        );
    }

    /**
     * Validates that no site with a name matching the given pattern already
     * exists. Key conflicts are handled separately and no longer treated as an
     * error (see getSiteByKey usage in execute()).
     */
    private async validateSiteNameNotTaken(transactionId: string, name: string): Promise<void> {
        const sitesWithMatchingName = await this.queryBus.execute<RetrieveSitesQuery, Site[]>(
            new RetrieveSitesQuery(transactionId, 1, 1, undefined, undefined, undefined, `%${name}%`),
        );

        if (sitesWithMatchingName.length > 0) {
            throw new ConflictException(`Site matching the name "${name}" already exists.`);
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

    // ── Workflow ─────────────────────────────────────────────────────────────

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
    ): Promise<SiteWorkflowResult> {
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

        return await siteWorkflow.getOrCreate();
    }

    // ── Creation helper ──────────────────────────────────────────────────────

    private async createSite(
        key: string,
        name: string,
        customerKey: string,
        managers: PartialSiteManagerWithUserId[],
        auditors: PartialSiteAuditorWithUserId[],
        supportTeamMembers: PartialSiteSupportTeamMemberWithUserId[],
        approvers: PartialSiteApprover[],
    ): Promise<Site> {
        const siteEntity = SiteEntity.createWithoutId(
            key,
            name,
            customerKey,
            managers,
            auditors,
            supportTeamMembers,
            approvers,
        );

        return await this.siteRepositoryService.create(siteEntity);
    }

    // ── Sync helpers (re-ingestion path) ─────────────────────────────────────

    /**
     * Inserts managers from the workflow result that are not yet recorded in
     * the DB for this site (deduplicated by userId).
     */
    private async syncNewManagers(existingSite: Site, incomingManagers: PartialSiteManagerWithUserId[]): Promise<void> {
        const existingUserIds = new Set(existingSite.siteManagers.map((m) => m.userId));

        for (const manager of incomingManagers) {
            if (existingUserIds.has(manager.userId)) {
                continue;
            }

            const entity = SiteManagerEntity.createWithoutId(
                existingSite.id,
                manager.userId,
                manager.username,
                manager.email,
            );

            await this.siteManagerRepositoryService.createOrUpdateById(entity);
        }
    }

    /**
     * Inserts auditors from the workflow result that are not yet recorded in
     * the DB for this site (deduplicated by userId).
     */
    private async syncNewAuditors(existingSite: Site, incomingAuditors: PartialSiteAuditorWithUserId[]): Promise<void> {
        const existingUserIds = new Set(existingSite.siteAuditors.map((a) => a.userId));

        for (const auditor of incomingAuditors) {
            if (existingUserIds.has(auditor.userId)) {
                continue;
            }

            const entity = SiteAuditorEntity.createWithoutId(
                existingSite.id,
                auditor.userId,
                auditor.username,
                auditor.email,
                auditor.isAdminOperator,
            );

            await this.siteAuditorRepositoryService.createOrUpdateById(entity);
        }
    }

    /**
     * Inserts approvers from the command that are not yet recorded in the DB
     * for this site (deduplicated by email).
     */
    private async syncNewApprovers(existingSite: Site, incomingApprovers: PartialSiteApprover[]): Promise<void> {
        const existingEmails = new Set(existingSite.siteApprovers.map((a) => a.email));

        for (const approver of incomingApprovers) {
            if (existingEmails.has(approver.email)) {
                continue;
            }

            const entity = SiteApproverEntity.createWithoutId(existingSite.id, approver.email);

            await this.siteApproverRepositoryService.createOrUpdateById(entity);
        }
    }
}
