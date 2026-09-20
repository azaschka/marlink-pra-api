/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { BusinessUnit } from '../../beyondtrust-instance/enums';
import {
    AddJumpointToGroupPolicyCommand,
    RemoveJumpointFromGroupPolicyCommand,
} from '../../group-policy-jumpoint/commands';
import { GroupPolicyJumpoint } from '../../group-policy-jumpoint/models';
import { RetrieveGroupPolicyJumpointsQuery } from '../../group-policy-jumpoint/queries';
import { AddTeamToGroupPolicyCommand, RemoveTeamFromGroupPolicyCommand } from '../../group-policy-team/commands';
import { GroupPolicyTeamRoleType } from '../../group-policy-team/enums';
import { GroupPolicyTeam } from '../../group-policy-team/models';
import { RetrieveGroupPolicyTeamsQuery } from '../../group-policy-team/queries';
import { PaginationUtility } from '../../shared/utilities';
import { BaseWorkflow } from '../../shared/workflows';
import { ErrorReport } from '../error-reports';
import {
    PartialSiteApprover,
    PartialSiteAuditor,
    PartialSiteManager,
    PartialSiteSupportTeamMember,
    SiteWorkflowResult,
} from '../models';
import {
    AdministratorGroupPolicyWorkflow,
    BuSupportGroupPolicyWorkflow,
    ManagerGroupPolicyWorkflow,
    MarlinkOperatorGroupPolicyWorkflow,
    MarlinkSuperuserGroupPolicyWorkflow,
    OperatorGroupPolicyWorkflow,
} from './group-policies';
import { AuthJumpPolicyWorkflow, NoAuthJumpPolicyWorkflow, NotifyJumpPolicyWorkflow } from './jump-policies';
import { JumpointsWorkflow } from './jumpoints';
import { SiteAuditorWorkflow } from './site-auditor.workflow';
import { SiteManagerWorkflow } from './site-manager.workflow';
import { SiteSupportTeamMemberWorkflow } from './site-support-team-member.workflow';
import { TeamWorkflow } from './teams';
import { SiteManagerUserWorkflow } from './users';

export class SiteWorkflow implements BaseWorkflow<SiteWorkflowResult, ErrorReport> {
    private static readonly MAX_PAGE_RETRIEVAL_SIZE = 100;

    private readonly managerGroupPolicyWorkflow: ManagerGroupPolicyWorkflow;
    private readonly operatorGroupPolicyWorkflow: OperatorGroupPolicyWorkflow;
    private readonly siteManagerUserWorkflows: SiteManagerUserWorkflow[];
    private readonly siteManagerWorkflows: SiteManagerWorkflow[];
    private readonly siteAuditorWorkflows: SiteAuditorWorkflow[];
    private readonly siteSupportTeamMemberWorkflows: SiteSupportTeamMemberWorkflow[];
    private readonly teamWorkflow: TeamWorkflow;
    private readonly authJumpPolicyWorkflow: AuthJumpPolicyWorkflow;
    private readonly noAuthJumpPolicyWorkflow: NoAuthJumpPolicyWorkflow;
    private readonly notifyJumpPolicyWorkflow: NotifyJumpPolicyWorkflow;
    private readonly jumpointsWorkflow: JumpointsWorkflow;
    private readonly administratorGroupPolicyWorkflow: AdministratorGroupPolicyWorkflow;
    private readonly marlinkOperatorGroupPolicyWorkflow: MarlinkOperatorGroupPolicyWorkflow;
    private readonly marlinkSuperuserGroupPolicyWorkflow: MarlinkSuperuserGroupPolicyWorkflow;
    private readonly buSupportGroupPolicyWorkflow: BuSupportGroupPolicyWorkflow;

    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly queryBus: QueryBus,
        private readonly commandBus: CommandBus,
        private readonly transactionId: string,
        private readonly siteName: string,
        private readonly siteKey: string,
        private readonly siteManagers: PartialSiteManager[],
        private readonly siteAuditors: PartialSiteAuditor[],
        private readonly siteSupportTeamMembers: PartialSiteSupportTeamMember[],
        private readonly siteApprovers: PartialSiteApprover[],
        private readonly customerName: string,
        private readonly customerBusinessUnit: BusinessUnit,
        private readonly customerBeyondtrustInstanceId: number,
    ) {
        this.managerGroupPolicyWorkflow = new ManagerGroupPolicyWorkflow(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            this.transactionId,
            this.siteName,
            this.siteKey,
            this.customerName,
            this.customerBeyondtrustInstanceId,
        );

        this.operatorGroupPolicyWorkflow = new OperatorGroupPolicyWorkflow(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            this.transactionId,
            this.siteName,
            this.siteKey,
            this.customerName,
            this.customerBeyondtrustInstanceId,
        );

        this.teamWorkflow = new TeamWorkflow(
            this.queryBus,
            this.commandBus,
            this.transactionId,
            this.siteName,
            this.siteKey,
            this.customerName,
            this.customerBeyondtrustInstanceId,
        );

        this.authJumpPolicyWorkflow = new AuthJumpPolicyWorkflow(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            this.transactionId,
            this.siteName,
            this.siteKey,
            this.siteApprovers,
            this.siteManagers,
            this.customerName,
            this.customerBeyondtrustInstanceId,
        );

        this.noAuthJumpPolicyWorkflow = new NoAuthJumpPolicyWorkflow(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            this.transactionId,
            this.siteName,
            this.siteKey,
            this.customerName,
            this.customerBeyondtrustInstanceId,
        );

        this.notifyJumpPolicyWorkflow = new NotifyJumpPolicyWorkflow(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            this.transactionId,
            this.siteName,
            this.siteKey,
            this.siteManagers,
            this.customerName,
            this.customerBeyondtrustInstanceId,
        );

        this.jumpointsWorkflow = new JumpointsWorkflow(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            this.transactionId,
            this.siteName,
            this.siteKey,
            this.customerName,
            this.customerBusinessUnit,
            this.customerBeyondtrustInstanceId,
        );

        this.administratorGroupPolicyWorkflow = new AdministratorGroupPolicyWorkflow(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            this.transactionId,
            this.customerName,
            this.customerBeyondtrustInstanceId,
        );

        this.marlinkOperatorGroupPolicyWorkflow = new MarlinkOperatorGroupPolicyWorkflow(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            this.transactionId,
            this.customerBeyondtrustInstanceId,
        );

        this.marlinkSuperuserGroupPolicyWorkflow = new MarlinkSuperuserGroupPolicyWorkflow(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            this.transactionId,
            this.customerBeyondtrustInstanceId,
        );

        this.buSupportGroupPolicyWorkflow = new BuSupportGroupPolicyWorkflow(
            this.queryBus,
            this.transactionId,
            this.customerBusinessUnit,
            this.customerBeyondtrustInstanceId,
        );

        this.siteManagerUserWorkflows = this.siteManagers.map(
            (siteManager) =>
                new SiteManagerUserWorkflow(
                    this.appConfigService,
                    this.queryBus,
                    this.commandBus,
                    this.transactionId,
                    this.siteName,
                    siteManager,
                    this.customerBeyondtrustInstanceId,
                ),
        );

        this.siteManagerWorkflows = this.siteManagers.map(
            (siteManager) =>
                new SiteManagerWorkflow(
                    this.appConfigService,
                    this.queryBus,
                    this.commandBus,
                    this.transactionId,
                    this.siteName,
                    siteManager,
                    this.customerBeyondtrustInstanceId,
                    this.managerGroupPolicyWorkflow,
                    this.authJumpPolicyWorkflow,
                    this.notifyJumpPolicyWorkflow,
                ),
        );

        this.siteAuditorWorkflows = this.siteAuditors.map(
            (siteAuditor) =>
                new SiteAuditorWorkflow(
                    this.appConfigService,
                    this.queryBus,
                    this.commandBus,
                    this.transactionId,
                    siteAuditor,
                    this.customerName,
                    this.customerBeyondtrustInstanceId,
                    this.administratorGroupPolicyWorkflow,
                    this.operatorGroupPolicyWorkflow,
                ),
        );

        this.siteSupportTeamMemberWorkflows = this.siteSupportTeamMembers.map(
            (siteSupportTeamMember) =>
                new SiteSupportTeamMemberWorkflow(
                    this.appConfigService,
                    this.queryBus,
                    this.commandBus,
                    this.transactionId,
                    siteSupportTeamMember,
                    this.customerName,
                    this.customerBeyondtrustInstanceId,
                    this.administratorGroupPolicyWorkflow,
                    this.operatorGroupPolicyWorkflow,
                    this.jumpointsWorkflow,
                    this.buSupportGroupPolicyWorkflow,
                ),
        );
    }

    public async getOrCreate(): Promise<SiteWorkflowResult> {
        const siteWorkflowResult: SiteWorkflowResult = {
            siteManagers: [],
            siteAuditors: [],
            siteSupportTeamMembers: [],
            unresolvedEmails: { siteManagers: [], siteAuditors: [], siteSupportTeamMembers: [] },
            errorReport: new ErrorReport(),
        };
        const managerGroupPolicy = await this.managerGroupPolicyWorkflow.getOrCreate();
        const operatorGroupPolicy = await this.operatorGroupPolicyWorkflow.getOrCreate();
        const team = await this.teamWorkflow.getOrCreate();
        const jumpoints = await this.jumpointsWorkflow.getOrCreate();
        const administratorGroupPolicy = await this.administratorGroupPolicyWorkflow.getOrCreate();
        const marlinkOperatorGroupPolicy = await this.marlinkOperatorGroupPolicyWorkflow.getOrCreate();
        const marlinkSuperuserGroupPolicy = await this.marlinkSuperuserGroupPolicyWorkflow.getOrCreate();

        // Site managers' BeyondTrust accounts must exist before the auth jump policy is created so it
        // can be given their real user ids as approvers (approvalUserIds) instead of ever falling back
        // to a manager's raw email address as an approval_email_addresses entry (MARLINKPRA-58). This is
        // idempotent: SiteManagerWorkflow below fetches the same, already-created users.
        const siteManagerUserIds: string[] = [];
        for (const siteManagerUserWorkflow of this.siteManagerUserWorkflows) {
            // A single unresolvable manager must not abort the whole ingestion here. The manager loop below
            // reports it, and the auth jump policy is created with whichever managers could be resolved.
            try {
                const siteManagerUser = await siteManagerUserWorkflow.getOrCreate();
                if (siteManagerUser) {
                    siteManagerUserIds.push(siteManagerUser.id.toString());
                }
            } catch (error) {
                console.error(`[${this.transactionId}] Failed to resolve a site manager user upfront:`, error);
            }
        }

        await this.authJumpPolicyWorkflow.getOrCreate(siteManagerUserIds);
        await this.noAuthJumpPolicyWorkflow.getOrCreate();
        await this.notifyJumpPolicyWorkflow.getOrCreate();

        for (const [index, siteManagerWorkflow] of this.siteManagerWorkflows.entries()) {
            const siteManager = this.siteManagers[index];

            try {
                siteWorkflowResult.siteManagers.push(await siteManagerWorkflow.getOrCreate());
            } catch (error) {
                console.error(`[${this.transactionId}] Failed to process site manager ${siteManager?.email}:`, error);
                siteWorkflowResult.errorReport.add(error);

                // Not resolvable is not the same as removed from the ingestion data. Recording the entry keeps
                // the caller from deleting an existing membership because of a transient failure.
                if (siteManager) {
                    siteWorkflowResult.unresolvedEmails.siteManagers.push(siteManager.email);
                }
            }
        }

        for (const [index, siteAuditorWorkflow] of this.siteAuditorWorkflows.entries()) {
            const siteAuditor = this.siteAuditors[index];

            try {
                siteWorkflowResult.siteAuditors.push(await siteAuditorWorkflow.getOrCreate());
            } catch (error) {
                console.error(`[${this.transactionId}] Failed to process site auditor ${siteAuditor?.email}:`, error);
                siteWorkflowResult.errorReport.add(error);

                // Not resolvable is not the same as removed from the ingestion data. Recording the entry keeps
                // the caller from deleting an existing membership because of a transient failure.
                if (siteAuditor) {
                    siteWorkflowResult.unresolvedEmails.siteAuditors.push(siteAuditor.email);
                }
            }
        }

        for (const [index, siteSupportTeamMemberWorkflow] of this.siteSupportTeamMemberWorkflows.entries()) {
            const siteSupportTeamMember = this.siteSupportTeamMembers[index];

            try {
                siteWorkflowResult.siteSupportTeamMembers.push(await siteSupportTeamMemberWorkflow.getOrCreate());
            } catch (error) {
                console.error(
                    `[${this.transactionId}] Failed to process site support team member ${siteSupportTeamMember?.email}:`,
                    error,
                );
                siteWorkflowResult.errorReport.add(error);

                // Not resolvable is not the same as removed from the ingestion data. Recording the entry keeps
                // the caller from deleting an existing membership because of a transient failure.
                if (siteSupportTeamMember) {
                    siteWorkflowResult.unresolvedEmails.siteSupportTeamMembers.push(siteSupportTeamMember.email);
                }
            }
        }

        // add team to manager group policy as manager
        // add team to operator group policy as member
        for (const { groupPolicyId, roleType } of [
            { groupPolicyId: managerGroupPolicy.id, roleType: GroupPolicyTeamRoleType.Manager },
            { groupPolicyId: operatorGroupPolicy.id, roleType: GroupPolicyTeamRoleType.Member },
        ]) {
            const groupPolicyTeam = (await this.getAllGroupPolicyTeams(groupPolicyId)).find(
                (groupPolicyTeam) => groupPolicyTeam.teamId === team.id,
            );

            // If the team is already added to the group policy with the same role type, skip
            if (groupPolicyTeam && groupPolicyTeam.roleType === roleType) {
                continue;
            }

            // If the team is already added to the group policy with different role type, remove it
            if (groupPolicyTeam && groupPolicyTeam.roleType !== roleType) {
                await this.commandBus.execute<RemoveTeamFromGroupPolicyCommand, GroupPolicyTeam>(
                    new RemoveTeamFromGroupPolicyCommand(
                        this.transactionId,
                        this.customerBeyondtrustInstanceId,
                        groupPolicyId,
                        team.id,
                    ),
                );
            }

            await this.commandBus.execute<AddTeamToGroupPolicyCommand, GroupPolicyTeam>(
                new AddTeamToGroupPolicyCommand(
                    this.transactionId,
                    this.customerBeyondtrustInstanceId,
                    groupPolicyId,
                    team.id,
                    roleType,
                ),
            );
        }

        // add jumpoints to administrator group policy, marlink operator group policy and marlink superuser group policy
        for (const groupPolicy of [administratorGroupPolicy, marlinkOperatorGroupPolicy, marlinkSuperuserGroupPolicy]) {
            const groupPolicyJumpoints = await this.getAllGroupPolicyJumpoints(groupPolicy.id);

            for (const jumpoint of jumpoints) {
                // Skip if the jumpoint is already added to the group policy
                if (
                    groupPolicyJumpoints.some((groupPolicyJumpoint) => groupPolicyJumpoint.jumpointId === jumpoint.id)
                ) {
                    continue;
                }

                await this.commandBus.execute<AddJumpointToGroupPolicyCommand, GroupPolicyJumpoint>(
                    new AddJumpointToGroupPolicyCommand(
                        this.transactionId,
                        this.customerBeyondtrustInstanceId,
                        groupPolicy.id,
                        jumpoint.id,
                    ),
                );
            }
        }

        // Add jumpoints to BU Support Group Policy (non-blocking: log warning if not found)
        try {
            const buGroupPolicy = await this.buSupportGroupPolicyWorkflow.get();

            if (buGroupPolicy) {
                const buGpJumpoints = await this.getAllGroupPolicyJumpoints(buGroupPolicy.id);

                for (const jumpoint of jumpoints) {
                    if (buGpJumpoints.some((gj) => gj.jumpointId === jumpoint.id)) {
                        continue;
                    }

                    await this.commandBus.execute<AddJumpointToGroupPolicyCommand, GroupPolicyJumpoint>(
                        new AddJumpointToGroupPolicyCommand(
                            this.transactionId,
                            this.customerBeyondtrustInstanceId,
                            buGroupPolicy.id,
                            jumpoint.id,
                        ),
                    );
                }
            } else {
                console.warn(
                    `[${this.transactionId}] BU Operators Group Policy "${this.buSupportGroupPolicyWorkflow.groupPolicyName}" (R3.1-P003) not found on instance ${this.customerBeyondtrustInstanceId}. Jumpoint assignment skipped.`,
                );
            }
        } catch (error) {
            console.error(`[${this.transactionId}] Failed to assign jumpoints to BU Support Group Policy:`, error);
        }

        return siteWorkflowResult;
    }

    /**
     * Removes the site's BeyondTrust artefacts and returns what could not be removed.
     *
     * Failures used to be written to the pod log only, so DELETE /site/{id} answered success even when the
     * memberships of the deleted site were still in place. R3.2-A005 is about cleaning those up, which means
     * the caller has to learn when the cleanup did not happen.
     */
    public async delete(): Promise<ErrorReport> {
        const errorReport = new ErrorReport();

        // Wrap in try-catch to handle cases where BeyondTrust instance no longer exists
        // If tenant doesn't exist (404), there's nothing to delete, so we can safely ignore
        try {
            const managerGroupPolicy = await this.managerGroupPolicyWorkflow.getOrCreate();
            const operatorGroupPolicy = await this.operatorGroupPolicyWorkflow.getOrCreate();
            const team = await this.teamWorkflow.getOrCreate();
            const jumpoints = await this.jumpointsWorkflow.getOrCreate();
            const administratorGroupPolicy = await this.administratorGroupPolicyWorkflow.getOrCreate();
            const marlinkOperatorGroupPolicy = await this.marlinkOperatorGroupPolicyWorkflow.getOrCreate();
            const marlinkSuperuserGroupPolicy = await this.marlinkSuperuserGroupPolicyWorkflow.getOrCreate();

            for (const siteManagerWorkflow of this.siteManagerWorkflows) {
                try {
                    await siteManagerWorkflow.delete();
                } catch (error) {
                    console.error(`[${this.transactionId}] Failed to delete site manager workflow:`, error);
                    errorReport.add(error);
                }
            }

            for (const siteAuditorWorkflow of this.siteAuditorWorkflows) {
                try {
                    await siteAuditorWorkflow.delete();
                } catch (error) {
                    console.error(`[${this.transactionId}] Failed to delete site auditor workflow:`, error);
                    errorReport.add(error);
                }
            }

            for (const siteSupportTeamMemberWorkflow of this.siteSupportTeamMemberWorkflows) {
                try {
                    await siteSupportTeamMemberWorkflow.delete();
                } catch (error) {
                    console.error(`[${this.transactionId}] Failed to delete site support team member workflow:`, error);
                    errorReport.add(error);
                }
            }

            // remove team from manager group policy
            // remove team from operator group policy
            for (const groupPolicy of [managerGroupPolicy, operatorGroupPolicy]) {
                const groupPolicyTeam = (await this.getAllGroupPolicyTeams(groupPolicy.id)).find(
                    (groupPolicyTeam) => groupPolicyTeam.teamId === team.id,
                );

                if (groupPolicyTeam) {
                    await this.commandBus.execute<RemoveTeamFromGroupPolicyCommand, GroupPolicyTeam>(
                        new RemoveTeamFromGroupPolicyCommand(
                            this.transactionId,
                            this.customerBeyondtrustInstanceId,
                            groupPolicy.id,
                            team.id,
                        ),
                    );
                }
            }

            // remove jumpoints from administrator group policy, marlink operator group policy and marlink superuser group policy
            for (const groupPolicy of [
                administratorGroupPolicy,
                marlinkOperatorGroupPolicy,
                marlinkSuperuserGroupPolicy,
            ]) {
                const groupPolicyJumpoints = await this.getAllGroupPolicyJumpoints(groupPolicy.id);

                for (const jumpoint of jumpoints) {
                    // Skip if the jumpoint is already removed from the group policy
                    if (
                        !groupPolicyJumpoints.some(
                            (groupPolicyJumpoint) => groupPolicyJumpoint.jumpointId === jumpoint.id,
                        )
                    ) {
                        continue;
                    }

                    await this.commandBus.execute<RemoveJumpointFromGroupPolicyCommand, GroupPolicyJumpoint>(
                        new RemoveJumpointFromGroupPolicyCommand(
                            this.transactionId,
                            this.customerBeyondtrustInstanceId,
                            groupPolicy.id,
                            jumpoint.id,
                        ),
                    );
                }
            }

            // Remove jumpoints from BU Support Group Policy
            try {
                const buGroupPolicy = await this.buSupportGroupPolicyWorkflow.get();

                if (buGroupPolicy) {
                    const buGpJumpoints = await this.getAllGroupPolicyJumpoints(buGroupPolicy.id);

                    for (const jumpoint of jumpoints) {
                        if (!buGpJumpoints.some((gj) => gj.jumpointId === jumpoint.id)) {
                            continue;
                        }

                        await this.commandBus.execute<RemoveJumpointFromGroupPolicyCommand, GroupPolicyJumpoint>(
                            new RemoveJumpointFromGroupPolicyCommand(
                                this.transactionId,
                                this.customerBeyondtrustInstanceId,
                                buGroupPolicy.id,
                                jumpoint.id,
                            ),
                        );
                    }
                }
            } catch (error) {
                console.error(
                    `[${this.transactionId}] Failed to remove jumpoints from BU Support Group Policy:`,
                    error,
                );
            }

            await this.managerGroupPolicyWorkflow.delete();
            await this.operatorGroupPolicyWorkflow.delete();
            await this.teamWorkflow.delete();
            await this.jumpointsWorkflow.delete();
            await this.authJumpPolicyWorkflow.delete();
            await this.noAuthJumpPolicyWorkflow.delete();
            await this.notifyJumpPolicyWorkflow.delete();
        } catch (error) {
            const statusCode =
                (error as any)?.status ??
                (error as any)?.response?.statusCode ??
                (error as any)?.response?.message?.statusCode;

            if (statusCode === 404) {
                console.log(`[${this.transactionId}] External resource not found (404) - skipping cleanup`);

                return errorReport;
            }

            // The remaining artefacts could not be cleaned up. The site record is still removed, so the caller
            // has to be told what is left behind in BeyondTrust rather than receiving a bare success.
            console.error(`[${this.transactionId}] Failed to delete the site's BeyondTrust artefacts:`, error);
            errorReport.add(error);
        }

        return errorReport;
    }

    private async getAllGroupPolicyTeams(groupPolicyId: number): Promise<GroupPolicyTeam[]> {
        return await PaginationUtility.queryUntilLastPage<GroupPolicyTeam>((pageNumber) =>
            this.queryBus.execute<RetrieveGroupPolicyTeamsQuery, GroupPolicyTeam[]>(
                new RetrieveGroupPolicyTeamsQuery(
                    this.transactionId,
                    this.customerBeyondtrustInstanceId,
                    SiteWorkflow.MAX_PAGE_RETRIEVAL_SIZE,
                    pageNumber,
                    groupPolicyId,
                ),
            ),
        );
    }

    private async getAllGroupPolicyJumpoints(groupPolicyId: number): Promise<GroupPolicyJumpoint[]> {
        return await PaginationUtility.queryUntilLastPage<GroupPolicyJumpoint>((pageNumber) =>
            this.queryBus.execute<RetrieveGroupPolicyJumpointsQuery, GroupPolicyJumpoint[]>(
                new RetrieveGroupPolicyJumpointsQuery(
                    this.transactionId,
                    this.customerBeyondtrustInstanceId,
                    SiteWorkflow.MAX_PAGE_RETRIEVAL_SIZE,
                    pageNumber,
                    groupPolicyId,
                ),
            ),
        );
    }
}
