import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { BusinessUnit } from '../../customer/enums';
import { AddJumpointToGroupPolicyCommand } from '../../group-policy-jumpoint/commands';
import { GroupPolicyJumpoint } from '../../group-policy-jumpoint/models';
import { AddTeamToGroupPolicyCommand } from '../../group-policy-team/commands';
import { GroupPolicyTeamRoleType } from '../../group-policy-team/enums';
import { GroupPolicyTeam } from '../../group-policy-team/models';
import { ModifyUserGroupPoliciesCommand } from '../../user-group-policy/commands';
import { UserGroupPolicy } from '../../user-group-policy/models';
import { SiteApprover } from '../models';
import { AdminGroupPolicyWorkflow } from './admin-group-policy.workflow';
import { AuthJumpPolicyWorkflow } from './auth-jump-policy.workflow';
import { JumpointsWorkflow } from './jumpoints.workflow';
import { ManagerGroupPolicyWorkflow } from './manager-group-policy.workflow';
import { MarlinkOperatorGroupPolicyWorkflow } from './marlink-operator-group-policy.workflow';
import { MarlinkSuperuserGroupPolicyWorkflow } from './marlink-superuser-group-policy.workflow';
import { NoAuthJumpPolicyWorkflow } from './no-auth-jump-policy.workflow';
import { NotifyJumpPolicyWorkflow } from './notify-jump-policy.workflow';
import { OperatorGroupPolicyWorkflow } from './operator-group-policy.workflow';
import { SiteManagerAccessGroupPolicyWorkflow } from './site-manager-access-group-policy.workflow';
import { SiteManagerUsersWorkflow } from './site-manager-users.workflow';
import { TeamWorkflow } from './team.workflow';

export class SiteWorkflow {
    private static readonly TOTAL_JUMPOINTS = 1;
    private readonly managerGroupPolicyWorkflow: ManagerGroupPolicyWorkflow;
    private readonly operatorGroupPolicyWorkflow: OperatorGroupPolicyWorkflow;
    private readonly siteManagerAccessGroupPolicyWorkflow: SiteManagerAccessGroupPolicyWorkflow;
    private readonly siteManagerUsersWorkflow: SiteManagerUsersWorkflow;
    private readonly teamWorkflow: TeamWorkflow;
    private readonly authJumpPolicyWorkflow: AuthJumpPolicyWorkflow;
    private readonly noAuthJumpPolicyWorkflow: NoAuthJumpPolicyWorkflow;
    private readonly notifyJumpPolicyWorkflow: NotifyJumpPolicyWorkflow;
    private readonly jumpointsWorkflow: JumpointsWorkflow;
    private readonly adminGroupPolicyWorkflow: AdminGroupPolicyWorkflow;
    private readonly marlinkOperatorGroupPolicyWorkflow: MarlinkOperatorGroupPolicyWorkflow;
    private readonly marlinkSuperuserGroupPolicyWorkflow: MarlinkSuperuserGroupPolicyWorkflow;

    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly queryBus: QueryBus,
        private readonly commandBus: CommandBus,
        private readonly transactionId: string,
        private readonly siteName: string,
        private readonly siteKey: string,
        private readonly siteApprovers: SiteApprover[],
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

        this.siteManagerAccessGroupPolicyWorkflow = new SiteManagerAccessGroupPolicyWorkflow(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            this.transactionId,
        );

        this.siteManagerUsersWorkflow = new SiteManagerUsersWorkflow(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            this.transactionId,
            this.siteName,
            this.siteApprovers,
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
            this.siteApprovers,
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
            this.siteApprovers,
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

        this.adminGroupPolicyWorkflow = new AdminGroupPolicyWorkflow(
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
    }

    public async run(): Promise<void> {
        const managerGroupPolicy = await this.managerGroupPolicyWorkflow.getOrCreate();
        const operatorGroupPolicy = await this.operatorGroupPolicyWorkflow.getOrCreate();
        const siteManagerAccessGroupPolicy = await this.siteManagerAccessGroupPolicyWorkflow.getOrCreate();
        const siteManagerUsers = await this.siteManagerUsersWorkflow.getOrCreate();
        const team = await this.teamWorkflow.getOrCreate();
        const jumpoints = await this.jumpointsWorkflow.getOrCreate();
        const adminGroupPolicy = await this.adminGroupPolicyWorkflow.getOrCreate();
        const marlinkOperatorGroupPolicy = await this.marlinkOperatorGroupPolicyWorkflow.getOrCreate();
        const marlinkSuperuserGroupPolicy = await this.marlinkSuperuserGroupPolicyWorkflow.getOrCreate();
        await this.authJumpPolicyWorkflow.getOrCreate();
        await this.noAuthJumpPolicyWorkflow.getOrCreate();
        await this.notifyJumpPolicyWorkflow.getOrCreate();

        // add site manager to manager group policy and site manager access group policy
        {
            for (const user of siteManagerUsers) {
                await this.commandBus.execute<ModifyUserGroupPoliciesCommand, UserGroupPolicy[]>(
                    new ModifyUserGroupPoliciesCommand(
                        this.transactionId,
                        user.id,
                        [managerGroupPolicy.id, siteManagerAccessGroupPolicy.id],
                        [],
                    ),
                );
            }
        }

        // add team to manager group policy and operator group policy teams
        {
            await this.commandBus.execute<AddTeamToGroupPolicyCommand, GroupPolicyTeam>(
                new AddTeamToGroupPolicyCommand(
                    this.transactionId,
                    managerGroupPolicy.id,
                    team.id,
                    GroupPolicyTeamRoleType.Manager,
                ),
            );
            await this.commandBus.execute<AddTeamToGroupPolicyCommand, GroupPolicyTeam>(
                new AddTeamToGroupPolicyCommand(
                    this.transactionId,
                    operatorGroupPolicy.id,
                    team.id,
                    GroupPolicyTeamRoleType.Member,
                ),
            );
        }

        // add jumpoints to admin group policy, marlink operator group policy and marlink superuser group policy
        {
            for (const jumpoint of jumpoints) {
                await this.commandBus.execute<AddJumpointToGroupPolicyCommand, GroupPolicyJumpoint>(
                    new AddJumpointToGroupPolicyCommand(this.transactionId, adminGroupPolicy.id, jumpoint.id),
                );
                await this.commandBus.execute<AddJumpointToGroupPolicyCommand, GroupPolicyJumpoint>(
                    new AddJumpointToGroupPolicyCommand(this.transactionId, marlinkOperatorGroupPolicy.id, jumpoint.id),
                );
                await this.commandBus.execute<AddJumpointToGroupPolicyCommand, GroupPolicyJumpoint>(
                    new AddJumpointToGroupPolicyCommand(
                        this.transactionId,
                        marlinkSuperuserGroupPolicy.id,
                        jumpoint.id,
                    ),
                );
            }
        }
    }
}
