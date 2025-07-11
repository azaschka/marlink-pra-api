import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { AddTeamToGroupPolicyCommand } from '../../group-policy-team/commands';
import { GroupPolicyTeamRoleType } from '../../group-policy-team/enums';
import { GroupPolicyTeam } from '../../group-policy-team/models';
import { ModifyUserGroupPoliciesCommand } from '../../user-group-policy/commands';
import { UserGroupPolicy } from '../../user-group-policy/models';
import { SiteApprover } from '../models';
import { ManagerGroupPolicyWorkflow } from './manager-group-policy.workflow';
import { OperatorGroupPolicyWorkflow } from './operator-group-policy.workflow';
import { SiteManagerAccessGroupPolicyWorkflow } from './site-manager-access-group-policy.workflow';
import { SiteManagerUserWorkflow } from './site-manager-user.workflow';
import { TeamWorkflow } from './team.workflow';

export class SiteWorkflow {
    private readonly managerGroupPolicyWorkflow: ManagerGroupPolicyWorkflow;
    private readonly operatorGroupPolicyWorkflow: OperatorGroupPolicyWorkflow;
    private readonly siteManagerAccessGroupPolicyWorkflow: SiteManagerAccessGroupPolicyWorkflow;
    private readonly siteManagerUserWorkflows: SiteManagerUserWorkflow[];
    private readonly teamWorkflow: TeamWorkflow;

    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly queryBus: QueryBus,
        private readonly commandBus: CommandBus,
        private readonly transactionId: string,
        private readonly siteName: string,
        private readonly siteKey: string,
        private readonly siteApprovers: SiteApprover[],
        private readonly customerName: string,
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

        this.siteManagerUserWorkflows = this.siteApprovers.map(
            (approver) =>
                new SiteManagerUserWorkflow(
                    this.appConfigService,
                    this.queryBus,
                    this.commandBus,
                    this.transactionId,
                    this.siteName,
                    approver,
                ),
        );

        this.teamWorkflow = new TeamWorkflow(
            this.queryBus,
            this.commandBus,
            this.transactionId,
            this.siteName,
            this.siteKey,
            this.customerName,
        );
    }

    public async run(): Promise<void> {
        const managerGroupPolicy = await this.managerGroupPolicyWorkflow.getOrCreate();
        const operatorGroupPolicy = await this.operatorGroupPolicyWorkflow.getOrCreate();
        const siteManagerAccessGroupPolicy = await this.siteManagerAccessGroupPolicyWorkflow.getOrCreate();
        const siteManagerUsers = await Promise.all(
            this.siteManagerUserWorkflows.map((workflow) => workflow.getOrCreate()),
        );
        const team = await this.teamWorkflow.getOrCreate();

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
    }
}
