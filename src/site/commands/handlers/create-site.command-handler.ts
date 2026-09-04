import { ConflictException, NotFoundException } from '@nestjs/common';
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
import { RetrieveSiteByIdQuery, RetrieveSitesQuery } from '../../queries';
import { SiteEntity } from '../../repositories/entities';
import { SiteRepositoryService } from '../../repositories/services/site-repository.service';
import { SiteWorkflow } from '../../workflows';
import { CreateSiteCommand } from '../create-site.command';
import { RemoveSiteAuditorCommand } from '../remove-site-auditor.command';
import { RemoveSiteManagerCommand } from '../remove-site-manager.command';
import { RemoveSiteSupportTeamMemberCommand } from '../remove-site-support-team-member.command';

@CommandHandler(CreateSiteCommand)
export class CreateSiteCommandHandler implements ICommandHandler<CreateSiteCommand> {
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
            existingSite,
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

            return {
                site: createdSite,
                errorReport: siteWorkflowResult.errorReport,
            };
        }

        const updatedSite = await this.updateSite(
            command.transactionId,
            existingSite,
            siteWorkflowResult.siteManagers,
            siteWorkflowResult.siteAuditors,
            siteWorkflowResult.siteSupportTeamMembers,
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
        existingSite: Site | null,
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

        const result = await siteWorkflow.getOrCreate();

        if (existingSite) {
            const siteHandlersRemovalErrorReport = await this.runSiteHandlersRemovalWorkflow(
                transactionId,
                existingSite.id,
                this.filterByRemovedUserIds(existingSite.siteManagers, result.siteManagers),
                this.filterByRemovedUserIds(existingSite.siteAuditors, result.siteAuditors),
                this.filterByRemovedUserIds(existingSite.siteSupportTeamMembers, result.siteSupportTeamMembers),
            );

            result.errorReport.append(siteHandlersRemovalErrorReport);
        }

        return result;
    }

    private async runSiteHandlersRemovalWorkflow(
        transactionId: string,
        siteId: number,
        removedSiteManagers: SiteManager[],
        removedSiteAuditors: SiteAuditor[],
        removedSiteSupportTeamMembers: SiteSupportTeamMember[],
    ) {
        const errorReport = new ErrorReport();

        for (const removedSiteManager of removedSiteManagers) {
            try {
                await this.commandBus.execute<RemoveSiteManagerCommand, void>(
                    new RemoveSiteManagerCommand(transactionId, siteId, removedSiteManager.id),
                );
            } catch (error) {
                errorReport.add(error);
            }
        }

        for (const removedSiteAuditor of removedSiteAuditors) {
            try {
                await this.commandBus.execute<RemoveSiteAuditorCommand, void>(
                    new RemoveSiteAuditorCommand(transactionId, siteId, removedSiteAuditor.id),
                );
            } catch (error) {
                errorReport.add(error);
            }
        }

        for (const removedSiteSupportTeamMember of removedSiteSupportTeamMembers) {
            try {
                await this.commandBus.execute<RemoveSiteSupportTeamMemberCommand, void>(
                    new RemoveSiteSupportTeamMemberCommand(transactionId, siteId, removedSiteSupportTeamMember.id),
                );
            } catch (error) {
                errorReport.add(error);
            }
        }

        return errorReport;
    }

    private filterByRemovedUserIds<T extends { userId: number }>(
        existingEntities: T[],
        newEntities: { userId: number }[],
    ): T[] {
        return existingEntities.filter(
            (existingEntity) => !newEntities.some((newUser) => newUser.userId === existingEntity.userId),
        );
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
            const existingSiteManager = site.siteManagers.find((m) => m.userId === siteManager.userId);

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
            const existingSiteAuditor = site.siteAuditors.find((a) => a.userId === siteAuditor.userId);

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
            const existingSiteSupportTeamMember = site.siteSupportTeamMembers.find(
                (s) => s.userId === siteSupportTeamMember.userId,
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
            const existingSiteApprover = site.siteApprovers.find((a) => a.email === siteApprover.email);

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
