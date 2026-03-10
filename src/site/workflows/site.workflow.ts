/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { BusinessUnit } from '../../customer/enums';
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
import {
    PartialSiteAuditor,
    PartialSiteApprover,
    PartialSiteManager,
    PartialSiteSupportTeamMember,
    SiteWorkflowResult,
} from '../models';
import {
    AdministratorGroupPolicyWorkflow,
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

export class SiteWorkflow implements BaseWorkflow<SiteWorkflowResult> {
    private static readonly MAX_PAGE_RETRIEVAL_SIZE = 100;

    private readonly managerGroupPolicyWorkflow: ManagerGroupPolicyWorkflow;
    private readonly operatorGroupPolicyWorkflow: OperatorGroupPolicyWorkflow;
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
                ),
        );
    }

    public async getOrCreate(): Promise<SiteWorkflowResult> {
        const siteWorkflowResult: SiteWorkflowResult = {
            siteManagers: [],
            siteAuditors: [],
            siteSupportTeamMembers: [],
        };
        const managerGroupPolicy = await this.managerGroupPolicyWorkflow.getOrCreate();
        const operatorGroupPolicy = await this.operatorGroupPolicyWorkflow.getOrCreate();
        const team = await this.teamWorkflow.getOrCreate();
        const jumpoints = await this.jumpointsWorkflow.getOrCreate();
        const administratorGroupPolicy = await this.administratorGroupPolicyWorkflow.getOrCreate();
        const marlinkOperatorGroupPolicy = await this.marlinkOperatorGroupPolicyWorkflow.getOrCreate();
        const marlinkSuperuserGroupPolicy = await this.marlinkSuperuserGroupPolicyWorkflow.getOrCreate();
        await this.authJumpPolicyWorkflow.getOrCreate();
        await this.noAuthJumpPolicyWorkflow.getOrCreate();
        await this.notifyJumpPolicyWorkflow.getOrCreate();

        for (const siteManagerWorkflow of this.siteManagerWorkflows) {
            const siteManager = await siteManagerWorkflow.getOrCreate();
            siteWorkflowResult.siteManagers.push(siteManager);
        }

        for (const siteAuditorWorkflow of this.siteAuditorWorkflows) {
            const siteAuditor = await siteAuditorWorkflow.getOrCreate();
            siteWorkflowResult.siteAuditors.push(siteAuditor);
        }

        for (const siteSupportTeamMemberWorkflow of this.siteSupportTeamMemberWorkflows) {
            const siteSupportTeamMember = await siteSupportTeamMemberWorkflow.getOrCreate();
            siteWorkflowResult.siteSupportTeamMembers.push(siteSupportTeamMember);
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

        return siteWorkflowResult;
    }

    public async delete(): Promise<void> {
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
                await siteManagerWorkflow.delete();
            }

            for (const siteAuditorWorkflow of this.siteAuditorWorkflows) {
                await siteAuditorWorkflow.delete();
            }

            for (const siteSupportTeamMemberWorkflow of this.siteSupportTeamMemberWorkflows) {
                await siteSupportTeamMemberWorkflow.delete();
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
                return;
            }

            throw error;
        }
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
