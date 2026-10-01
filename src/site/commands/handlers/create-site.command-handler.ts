import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { CommandBus, CommandHandler, EventBus, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { BusinessUnit } from '../../../beyondtrust-instance/enums';
import { Customer } from '../../../customer/models';
import { RetrieveCustomersQuery } from '../../../customer/queries';
import { ErrorReport } from '../../error-reports';
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
    SiteAuditor,
    SiteManager,
    SiteProcessingResult,
    SiteSupportTeamMember,
    SiteWorkflowResult,
} from '../../models';
import { EmailUtility } from '../../../shared/utilities';
import { RetrieveSiteByIdQuery, RetrieveSitesQuery } from '../../queries';
import { SiteEntity } from '../../repositories/entities';
import { SiteRepositoryService } from '../../repositories/services/site-repository.service';
import { SiteWorkflow } from '../../workflows';
import { CreateSiteCommand } from '../create-site.command';
import { WorkflowFactory } from '../../workflows/factories';
import { RemovedSiteRole } from '../../workflows/users';
import { SiteUserType } from '../../enums';

@CommandHandler(CreateSiteCommand)
export class CreateSiteCommandHandler implements ICommandHandler<CreateSiteCommand> {
    private static readonly MINIMUM_SITE_MANAGER_COUNT = 1;

    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
        private readonly eventBus: EventBus,
        private readonly siteRepositoryService: SiteRepositoryService,
    ) {}

    public async execute(command: CreateSiteCommand): Promise<SiteProcessingResult> {
        const existingSite = await this.getSiteByKey(command.transactionId, command.key);

        // For new sites only: fail fast before any BeyondTrust calls.
        if (existingSite === null) {
            await this.validateSiteNameNotTaken(command.transactionId, command.name);
        }

        const customer = await this.getCustomer(command.transactionId, command.customerKey);

        // EXT-08: an omitted list keeps what the existing site has; it never means "remove everything".
        const partialSiteApprovers = (
            command.siteApproverEmails ??
            existingSite?.siteApprovers.map((approver) => approver.email) ??
            []
        ).map((email) => ({ email }));
        const keepExisting = {
            siteAuditors: existingSite !== null && command.siteAuditors === undefined,
            siteSupportTeamMembers: existingSite !== null && command.siteSupportTeamMembers === undefined,
        };

        // SiteWorkflow.getOrCreate() is fully idempotent: it creates BeyondTrust
        // users/group-policies/jump-policies only if they don't exist yet.
        const siteWorkflowResult = await this.runWorkflow(
            command.transactionId,
            command.name,
            command.key,
            command.siteManagers,
            command.siteAuditors ?? [],
            command.siteSupportTeamMembers ?? [],
            partialSiteApprovers,
            customer.name,
            customer.businessUnit,
            customer.beyondtrustInstanceId,
        );

        if (existingSite === null) {
            // ── New site path ────────────────────────────────────────────────
            this.validateMinimumSiteManagerCount(siteWorkflowResult.siteManagers, siteWorkflowResult.errorReport);

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

            return {
                site: createdSite,
                errorReport: siteWorkflowResult.errorReport,
            };
        }

        // ── Existing site path ───────────────────────────────────────────────
        // Rows that are kept as they are: users that could not be processed in this run (not resolvable is not the
        // same as removed from the ingestion data), and every row of a role whose list was omitted from the request.
        const keptEmails = {
            siteManagers: siteWorkflowResult.unresolvedEmails.siteManagers,
            siteAuditors: keepExisting.siteAuditors
                ? existingSite.siteAuditors.map((siteAuditor) => siteAuditor.email)
                : siteWorkflowResult.unresolvedEmails.siteAuditors,
            siteSupportTeamMembers: keepExisting.siteSupportTeamMembers
                ? existingSite.siteSupportTeamMembers.map((member) => member.email)
                : siteWorkflowResult.unresolvedEmails.siteSupportTeamMembers,
        };

        // EXT-01: the minimum is checked against the site as it will be after this run, before anything is removed.
        // Checking it per removal against the stored rows rejected the replacement of the only site manager and
        // still dropped the row, which left the old manager's BeyondTrust memberships behind for good.
        this.validateMinimumSiteManagerCount(
            this.retainSiteUsers(siteWorkflowResult.siteManagers, existingSite.siteManagers, keptEmails.siteManagers),
            siteWorkflowResult.errorReport,
        );

        const removal = await this.removeSiteUsers(command.transactionId, customer, existingSite, {
            siteManagers: this.filterRemovedSiteUsers(
                existingSite.siteManagers,
                siteWorkflowResult.siteManagers,
                keptEmails.siteManagers,
            ),
            siteAuditors: this.filterRemovedSiteUsers(
                existingSite.siteAuditors,
                siteWorkflowResult.siteAuditors,
                keptEmails.siteAuditors,
            ),
            siteSupportTeamMembers: this.filterRemovedSiteUsers(
                existingSite.siteSupportTeamMembers,
                siteWorkflowResult.siteSupportTeamMembers,
                keptEmails.siteSupportTeamMembers,
            ),
        });
        siteWorkflowResult.errorReport.append(removal.errorReport);

        // A user whose removal failed stays on the site, so the next run retries the removal instead of forgetting
        // the memberships that are still in place.
        const updatedSite = await this.updateSite(
            command.transactionId,
            existingSite,
            this.retainSiteUsers(siteWorkflowResult.siteManagers, existingSite.siteManagers, [
                ...keptEmails.siteManagers,
                ...removal.failedEmails.siteManagers,
            ]),
            this.retainSiteUsers(siteWorkflowResult.siteAuditors, existingSite.siteAuditors, [
                ...keptEmails.siteAuditors,
                ...removal.failedEmails.siteAuditors,
            ]),
            this.retainSiteUsers(siteWorkflowResult.siteSupportTeamMembers, existingSite.siteSupportTeamMembers, [
                ...keptEmails.siteSupportTeamMembers,
                ...removal.failedEmails.siteSupportTeamMembers,
            ]),
            partialSiteApprovers,
        );

        this.eventBus.publish(
            new SiteModifiedEvent(command.transactionId, {
                site: updatedSite,
            }),
        );

        return {
            site: updatedSite,
            errorReport: siteWorkflowResult.errorReport,
        };
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

    /**
     * Removes the BeyondTrust memberships of site users that the ingestion data no longer contains.
     *
     * The role workflows are called directly instead of through the Remove*Command handlers: those check the
     * minimum manager count against the stored rows and delete the row themselves, while this path has already
     * validated the resulting site and persists all rows in one update afterwards (EXT-01).
     */
    private async removeSiteUsers(
        transactionId: string,
        customer: Customer,
        site: Site,
        removed: {
            siteManagers: SiteManager[];
            siteAuditors: SiteAuditor[];
            siteSupportTeamMembers: SiteSupportTeamMember[];
        },
    ): Promise<{
        errorReport: ErrorReport;
        failedEmails: { siteManagers: string[]; siteAuditors: string[]; siteSupportTeamMembers: string[] };
    }> {
        const errorReport = new ErrorReport();
        const failedEmails = {
            siteManagers: [] as string[],
            siteAuditors: [] as string[],
            siteSupportTeamMembers: [] as string[],
        };
        // Users that left the ingestion data in this run go away together; a person removed from two roles at
        // once must not keep the shared memberships or the account because of the other removed role (EXT-03).
        const removedTogether: RemovedSiteRole[] = [
            ...removed.siteManagers.map((row) => ({
                siteUserType: SiteUserType.SiteManager,
                id: row.id,
                siteId: row.siteId,
            })),
            ...removed.siteAuditors.map((row) => ({
                siteUserType: SiteUserType.SiteAuditor,
                id: row.id,
                siteId: row.siteId,
            })),
            ...removed.siteSupportTeamMembers.map((row) => ({
                siteUserType: SiteUserType.SiteSupportTeamMember,
                id: row.id,
                siteId: row.siteId,
            })),
        ];
        const workflowFactory = WorkflowFactory.create(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            transactionId,
            customer,
            site,
        );

        const removeEach = async <T extends { email: string }>(
            siteUsers: T[],
            siteUserType: SiteUserType,
            failed: string[],
            remove: (siteUser: T) => Promise<void>,
        ) => {
            for (const siteUser of siteUsers) {
                try {
                    await remove(siteUser);
                } catch (error) {
                    console.error(`[${transactionId}] Failed to remove ${siteUserType} ${siteUser.email}:`, error);
                    errorReport.add(error, { siteUserType, email: siteUser.email, operation: 'remove' });
                    failed.push(siteUser.email);
                }
            }
        };

        await removeEach(removed.siteManagers, SiteUserType.SiteManager, failedEmails.siteManagers, (siteManager) =>
            workflowFactory.createSiteManagerWorkflow(siteManager).delete(removedTogether),
        );
        await removeEach(removed.siteAuditors, SiteUserType.SiteAuditor, failedEmails.siteAuditors, (siteAuditor) =>
            workflowFactory.createSiteAuditorWorkflow(siteAuditor).delete(removedTogether),
        );
        await removeEach(
            removed.siteSupportTeamMembers,
            SiteUserType.SiteSupportTeamMember,
            failedEmails.siteSupportTeamMembers,
            (member) => workflowFactory.createSiteSupportTeamMemberWorkflow(member).delete(removedTogether),
        );

        return { errorReport, failedEmails };
    }

    /**
     * Existing site users that the current ingestion run no longer contains.
     *
     * Matching is done on email, the business key of a site user. Matching on user id would treat a non-local
     * user whose BeyondTrust id changed as removed and re-added rather than unchanged.
     */
    private filterRemovedSiteUsers<T extends { email: string }>(
        existingEntities: T[],
        resolvedEntities: { email: string }[],
        keptEmails: string[],
    ): T[] {
        const resolvedEmails = resolvedEntities.map((resolvedEntity) => resolvedEntity.email);

        return existingEntities.filter(
            (existingEntity) =>
                !EmailUtility.includes(resolvedEmails, existingEntity.email) &&
                !EmailUtility.includes(keptEmails, existingEntity.email),
        );
    }

    /**
     * The users to persist: the ones processed in this run plus the existing rows listed in keptEmails (not
     * processable in this run, omitted role list, or failed removal).
     *
     * The persisted list is what decides which rows survive: SiteRepositoryService.update deletes every row
     * that is not in it. Without this, a transient lookup failure would silently strip a user from the site.
     */
    private retainSiteUsers<T extends { email: string }>(
        resolvedEntities: T[],
        existingEntities: T[],
        keptEmails: string[],
    ): T[] {
        const retainedEntities = existingEntities.filter(
            (existingEntity) =>
                EmailUtility.includes(keptEmails, existingEntity.email) &&
                !EmailUtility.includes(
                    resolvedEntities.map((resolvedEntity) => resolvedEntity.email),
                    existingEntity.email,
                ),
        );

        return [...resolvedEntities, ...retainedEntities];
    }

    /**
     * A site without a manager has nobody to approve its auth jump policy and cannot be maintained.
     * RemoveSiteManagerCommandHandler enforces the same invariant on the single removal endpoint, and since
     * user failures are reported instead of thrown, the ingestion path has to enforce it explicitly.
     *
     * The error report travels with the response so the caller sees which managers failed and why.
     */
    private validateMinimumSiteManagerCount(siteManagers: unknown[], errorReport: ErrorReport): void {
        if (siteManagers.length >= CreateSiteCommandHandler.MINIMUM_SITE_MANAGER_COUNT) {
            return;
        }

        throw new UnprocessableEntityException({
            message: `Site must have at least ${CreateSiteCommandHandler.MINIMUM_SITE_MANAGER_COUNT} site manager. None of the supplied site managers could be processed.`,
            errorReport: errorReport.items,
        });
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

    // ── Update helpers ──────────────────────────────────────────────────────
    private async updateSite(
        transactionId: string,
        existingSite: Site,
        managers: PartialSiteManagerWithUserId[],
        auditors: PartialSiteAuditorWithUserId[],
        supportTeamMembers: PartialSiteSupportTeamMemberWithUserId[],
        approvers: PartialSiteApprover[],
    ): Promise<Site> {
        const siteEntity = SiteEntity.createWithId(
            existingSite.id,
            existingSite.key,
            existingSite.name,
            existingSite.customerKey,
            this.enrichSiteManagersUsingExistingSiteData(managers, existingSite),
            this.enrichSiteAuditorsUsingExistingSiteData(auditors, existingSite),
            this.enrichSiteSupportTeamMembersUsingExistingSiteData(supportTeamMembers, existingSite),
            this.enrichSiteApproversUsingExistingSiteData(approvers, existingSite),
        );

        await this.siteRepositoryService.update(siteEntity);

        return await this.getSiteById(transactionId, existingSite.id);
    }

    private enrichSiteManagersUsingExistingSiteData(
        siteManagers: PartialSiteManagerWithUserId[],
        site: Site,
    ): PartialSiteManagerWithUserId[] {
        return siteManagers.map((siteManager) => {
            const existingSiteManager = site.siteManagers.find((m) =>
                EmailUtility.areEqual(m.email, siteManager.email),
            );

            if (!existingSiteManager) {
                return siteManager;
            }

            return {
                ...siteManager,
                id: existingSiteManager.id,
                siteId: existingSiteManager.siteId,
            };
        });
    }

    private enrichSiteAuditorsUsingExistingSiteData(
        siteAuditors: PartialSiteAuditorWithUserId[],
        site: Site,
    ): PartialSiteAuditorWithUserId[] {
        return siteAuditors.map((siteAuditor) => {
            const existingSiteAuditor = site.siteAuditors.find((a) =>
                EmailUtility.areEqual(a.email, siteAuditor.email),
            );

            if (!existingSiteAuditor) {
                return siteAuditor;
            }

            return {
                ...siteAuditor,
                id: existingSiteAuditor.id,
                siteId: existingSiteAuditor.siteId,
            };
        });
    }

    private enrichSiteSupportTeamMembersUsingExistingSiteData(
        siteSupportTeamMembers: PartialSiteSupportTeamMemberWithUserId[],
        site: Site,
    ): PartialSiteSupportTeamMemberWithUserId[] {
        return siteSupportTeamMembers.map((siteSupportTeamMember) => {
            const existingSiteSupportTeamMember = site.siteSupportTeamMembers.find((s) =>
                EmailUtility.areEqual(s.email, siteSupportTeamMember.email),
            );

            if (!existingSiteSupportTeamMember) {
                return siteSupportTeamMember;
            }

            return {
                ...siteSupportTeamMember,
                id: existingSiteSupportTeamMember.id,
                siteId: existingSiteSupportTeamMember.siteId,
            };
        });
    }

    private enrichSiteApproversUsingExistingSiteData(
        siteApprovers: PartialSiteApprover[],
        site: Site,
    ): PartialSiteApprover[] {
        return siteApprovers.map((siteApprover) => {
            const existingSiteApprover = site.siteApprovers.find((a) =>
                EmailUtility.areEqual(a.email, siteApprover.email),
            );

            if (!existingSiteApprover) {
                return siteApprover;
            }

            return {
                ...siteApprover,
                id: existingSiteApprover.id,
                siteId: existingSiteApprover.siteId,
            };
        });
    }
}
