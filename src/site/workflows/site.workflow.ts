import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { BusinessUnit } from '../../customer/enums';
import { AddJumpointToGroupPolicyCommand } from '../../group-policy-jumpoint/commands';
import { GroupPolicyJumpoint } from '../../group-policy-jumpoint/models';
import { RetrieveGroupPolicyJumpointsQuery } from '../../group-policy-jumpoint/queries';
import { AddTeamToGroupPolicyCommand, RemoveTeamFromGroupPolicyCommand } from '../../group-policy-team/commands';
import { GroupPolicyTeamRoleType } from '../../group-policy-team/enums';
import { GroupPolicyTeam } from '../../group-policy-team/models';
import { RetrieveGroupPolicyTeamsQuery } from '../../group-policy-team/queries';
import { PaginationUtility } from '../../shared/utilities';
import { BaseWorkflow } from '../../shared/workflows';
import {
    PartialSiteAdministrator,
    PartialSiteManager,
    PartialSiteSupportTeamMember,
    SiteWorkflowResult,
} from '../models';
import { AdministratorGroupPolicyWorkflow } from './group-policies/administrator-group-policy.workflow';
import { ManagerGroupPolicyWorkflow } from './group-policies/manager-group-policy.workflow';
import { MarlinkOperatorGroupPolicyWorkflow } from './group-policies/marlink-operator-group-policy.workflow';
import { MarlinkSuperuserGroupPolicyWorkflow } from './group-policies/marlink-superuser-group-policy.workflow';
import { OperatorGroupPolicyWorkflow } from './group-policies/operator-group-policy.workflow';
import { AuthJumpPolicyWorkflow } from './jump-policies/auth-jump-policy.workflow';
import { NoAuthJumpPolicyWorkflow } from './jump-policies/no-auth-jump-policy.workflow';
import { NotifyJumpPolicyWorkflow } from './jump-policies/notify-jump-policy.workflow';
import { JumpointsWorkflow } from './jumpoints/jumpoints.workflow';
import { SiteAdministratorWorkflow } from './site-administrator.workflow';
import { SiteManagerWorkflow } from './site-manager.workflow';
import { SiteSupportTeamMemberWorkflow } from './site-support-team-member.workflow';
import { TeamWorkflow } from './teams/team.workflow';

export class SiteWorkflow implements BaseWorkflow<SiteWorkflowResult> {
    private static readonly MAX_PAGE_RETRIEVAL_SIZE = 100;

    private static readonly TOTAL_JUMPOINTS = 1;
    private readonly managerGroupPolicyWorkflow: ManagerGroupPolicyWorkflow;
    private readonly operatorGroupPolicyWorkflow: OperatorGroupPolicyWorkflow;
    private readonly siteManagerWorkflows: SiteManagerWorkflow[];
    private readonly siteAdministratorWorkflows: SiteAdministratorWorkflow[];
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
        private readonly siteAdministrators: PartialSiteAdministrator[],
        private readonly siteSupportTeamMembers: PartialSiteSupportTeamMember[],
        private readonly customerName: string,
        private readonly customerBusinessUnit: BusinessUnit,
    ) {
        this.managerGroupPolicyWorkflow = new ManagerGroupPolicyWorkflow(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            this.transactionId,
            this.siteName,
            this.siteKey,
            this.customerName,
        );

        this.operatorGroupPolicyWorkflow = new OperatorGroupPolicyWorkflow(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            this.transactionId,
            this.siteName,
            this.siteKey,
            this.customerName,
        );

        this.teamWorkflow = new TeamWorkflow(
            this.queryBus,
            this.commandBus,
            this.transactionId,
            this.siteName,
            this.siteKey,
            this.customerName,
        );

        this.authJumpPolicyWorkflow = new AuthJumpPolicyWorkflow(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            this.transactionId,
            this.siteName,
            this.siteKey,
            this.siteManagers,
            this.customerName,
        );

        this.noAuthJumpPolicyWorkflow = new NoAuthJumpPolicyWorkflow(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            this.transactionId,
            this.siteName,
            this.siteKey,
            this.customerName,
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
        );

        this.jumpointsWorkflow = new JumpointsWorkflow(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            this.transactionId,
            SiteWorkflow.TOTAL_JUMPOINTS,
            this.siteName,
            this.siteKey,
            this.customerName,
            this.customerBusinessUnit,
        );

        this.administratorGroupPolicyWorkflow = new AdministratorGroupPolicyWorkflow(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            this.transactionId,
            this.customerName,
        );

        this.marlinkOperatorGroupPolicyWorkflow = new MarlinkOperatorGroupPolicyWorkflow(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            this.transactionId,
        );

        this.marlinkSuperuserGroupPolicyWorkflow = new MarlinkSuperuserGroupPolicyWorkflow(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            this.transactionId,
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
                    this.managerGroupPolicyWorkflow,
                    this.authJumpPolicyWorkflow,
                    this.notifyJumpPolicyWorkflow,
                ),
        );

        this.siteAdministratorWorkflows = this.siteAdministrators.map(
            (siteAdministrator) =>
                new SiteAdministratorWorkflow(
                    this.appConfigService,
                    this.queryBus,
                    this.commandBus,
                    this.transactionId,
                    siteAdministrator,
                    this.customerName,
                    this.administratorGroupPolicyWorkflow,
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
                    this.administratorGroupPolicyWorkflow,
                    this.operatorGroupPolicyWorkflow,
                    this.jumpointsWorkflow,
                ),
        );
    }

    public async getOrCreate(): Promise<SiteWorkflowResult> {
        const siteWorkflowResult: SiteWorkflowResult = {
            siteManagers: [],
            siteAdministrators: [],
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

        for (const siteAdministratorWorkflow of this.siteAdministratorWorkflows) {
            const siteAdministrator = await siteAdministratorWorkflow.getOrCreate();
            siteWorkflowResult.siteAdministrators.push(siteAdministrator);
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
                    new RemoveTeamFromGroupPolicyCommand(this.transactionId, groupPolicyId, team.id),
                );
            }

            await this.commandBus.execute<AddTeamToGroupPolicyCommand, GroupPolicyTeam>(
                new AddTeamToGroupPolicyCommand(this.transactionId, groupPolicyId, team.id, roleType),
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
                    new AddJumpointToGroupPolicyCommand(this.transactionId, groupPolicy.id, jumpoint.id),
                );
            }
        }

        return siteWorkflowResult;
    }

    public delete(): Promise<void> {
        throw new Error('Method not implemented.');
    }

    private async getAllGroupPolicyTeams(groupPolicyId: number): Promise<GroupPolicyTeam[]> {
        return await PaginationUtility.queryUntilLastPage<GroupPolicyTeam>((pageNumber) =>
            this.queryBus.execute<RetrieveGroupPolicyTeamsQuery, GroupPolicyTeam[]>(
                new RetrieveGroupPolicyTeamsQuery(
                    this.transactionId,
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
                    SiteWorkflow.MAX_PAGE_RETRIEVAL_SIZE,
                    pageNumber,
                    groupPolicyId,
                ),
            ),
        );
    }
}
