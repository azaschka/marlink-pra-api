import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { AddJumpGroupToGroupPolicyCommand } from '../../group-policy-jump-group/commands';
import { GroupPolicyJumpGroup } from '../../group-policy-jump-group/models';
import { RetrieveGroupPolicyJumpGroupsQuery } from '../../group-policy-jump-group/queries';
import { AddJumpointToGroupPolicyCommand } from '../../group-policy-jumpoint/commands';
import { GroupPolicyJumpoint } from '../../group-policy-jumpoint/models';
import { RetrieveGroupPolicyJumpointsQuery } from '../../group-policy-jumpoint/queries';
import { PaginationUtility } from '../../shared/utilities';
import { BaseWorkflow } from '../../shared/workflows';
import { ModifyUserGroupPoliciesCommand } from '../../user-group-policy/commands';
import { UserGroupPolicy } from '../../user-group-policy/models';
import { SiteSupportTeamAccessLevel } from '../enums';
import { PartialSiteSupportTeamMember, PartialSiteSupportTeamMemberWithUserId } from '../models';
import { AdministratorGroupPolicyWorkflow } from './group-policies/administrator-group-policy.workflow';
import { FullAccessGroupPolicyWorkflow } from './group-policies/full-access-group-policy.workflow';
import { LimitedAccessGroupPolicyWorkflow } from './group-policies/limited-access-group-policy.workflow';
import { OperatorGroupPolicyWorkflow } from './group-policies/operator-group-policy.workflow';
import { SupportTeamGroupPolicyWorkflow } from './group-policies/support-team-group-policy.workflow';
import { SupportTeamJumpGroupWorkflow } from './jump-groups/support-team-jump-group.workflow';
import { JumpointsWorkflow } from './jumpoints/jumpoints.workflow';
import { SiteSupportTeamMemberUserWorkflow } from './users/site-support-team-member-user.workflow';

export class SiteSupportTeamMemberWorkflow implements BaseWorkflow<PartialSiteSupportTeamMemberWithUserId> {
    private static readonly MAX_PAGE_RETRIEVAL_SIZE = 100;

    private readonly siteSupportTeamMemberUserWorkflow: SiteSupportTeamMemberUserWorkflow;
    private readonly supportTeamGroupPolicyWorkflow: SupportTeamGroupPolicyWorkflow;
    private readonly supportTeamJumpGroupWorkflow: SupportTeamJumpGroupWorkflow;
    private readonly limitedAccessGroupPolicyWorkflow: LimitedAccessGroupPolicyWorkflow;
    private readonly fullAccessGroupPolicyWorkflow: FullAccessGroupPolicyWorkflow;

    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly queryBus: QueryBus,
        private readonly commandBus: CommandBus,
        private readonly transactionId: string,
        private readonly siteSupportTeamMember: PartialSiteSupportTeamMember,
        private readonly customerName: string,
        private readonly administratorGroupPolicyWorkflow: AdministratorGroupPolicyWorkflow,
        private readonly operatorGroupPolicyWorkflow: OperatorGroupPolicyWorkflow,
        private readonly jumpointsWorkflow: JumpointsWorkflow,
    ) {
        this.siteSupportTeamMemberUserWorkflow = new SiteSupportTeamMemberUserWorkflow(
            this.queryBus,
            this.commandBus,
            this.transactionId,
            this.siteSupportTeamMember,
        );

        this.supportTeamGroupPolicyWorkflow = new SupportTeamGroupPolicyWorkflow(
            this.queryBus,
            this.commandBus,
            this.transactionId,
            this.siteSupportTeamMember,
            this.customerName,
        );

        this.supportTeamJumpGroupWorkflow = new SupportTeamJumpGroupWorkflow(
            this.queryBus,
            this.commandBus,
            this.transactionId,
            this.siteSupportTeamMember,
            this.customerName,
        );

        this.limitedAccessGroupPolicyWorkflow = new LimitedAccessGroupPolicyWorkflow(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            this.transactionId,
        );

        this.fullAccessGroupPolicyWorkflow = new FullAccessGroupPolicyWorkflow(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            this.transactionId,
        );
    }

    public async getOrCreate(): Promise<PartialSiteSupportTeamMemberWithUserId> {
        const administratorGroupPolicy = await this.administratorGroupPolicyWorkflow.getOrCreate();
        const operatorGroupPolicy = await this.operatorGroupPolicyWorkflow.getOrCreate();
        const supportTeamGroupPolicy = await this.supportTeamGroupPolicyWorkflow.getOrCreate();
        const limitedAccessGroupPolicy = await this.limitedAccessGroupPolicyWorkflow.getOrCreate();
        const fullAccessGroupPolicy = await this.fullAccessGroupPolicyWorkflow.getOrCreate();
        const supportTeamJumpGroup = await this.supportTeamJumpGroupWorkflow.getOrCreate();
        const siteSupportTeamMemberUser = await this.siteSupportTeamMemberUserWorkflow.getOrCreate();
        const jumpoints = await this.jumpointsWorkflow.getOrCreate();

        // Add the user to the support team group policy and operator group policy
        // and to the limited access or full access group policy based on the access level
        await this.commandBus.execute<ModifyUserGroupPoliciesCommand, UserGroupPolicy[]>(
            new ModifyUserGroupPoliciesCommand(
                this.transactionId,
                siteSupportTeamMemberUser.id,
                [
                    supportTeamGroupPolicy.id,
                    operatorGroupPolicy.id,
                    this.siteSupportTeamMember.supportTeamAccessLevel === SiteSupportTeamAccessLevel.Full
                        ? fullAccessGroupPolicy.id
                        : limitedAccessGroupPolicy.id,
                ],
                [],
            ),
        );

        // Add jumpoint to the support team group policy
        const groupPolicyJumpoints = await this.getAllGroupPolicyJumpoints(supportTeamGroupPolicy.id);
        for (const jumpoint of jumpoints) {
            // Skip if the jumpoint is already added to the group policy
            if (groupPolicyJumpoints.some((groupPolicyJumpoint) => groupPolicyJumpoint.jumpointId === jumpoint.id)) {
                continue;
            }

            await this.commandBus.execute<AddJumpointToGroupPolicyCommand, GroupPolicyJumpoint>(
                new AddJumpointToGroupPolicyCommand(this.transactionId, supportTeamGroupPolicy.id, jumpoint.id),
            );
        }

        // Add jump group to the support team group policy and administrator group policy
        for (const groupPolicy of [supportTeamGroupPolicy, administratorGroupPolicy]) {
            const groupPolicyJumpGroups = await this.getAllGroupPolicyJumpGroups(groupPolicy.id);

            // Skip if the jump group is already added to the group policy
            if (
                groupPolicyJumpGroups.some(
                    (groupPolicyJumpGroup) => groupPolicyJumpGroup.jumpGroupId === supportTeamJumpGroup.id,
                )
            ) {
                continue;
            }

            await this.commandBus.execute<AddJumpGroupToGroupPolicyCommand, GroupPolicyJumpGroup>(
                new AddJumpGroupToGroupPolicyCommand(this.transactionId, groupPolicy.id, supportTeamJumpGroup.id),
            );
        }

        return {
            ...this.siteSupportTeamMember,
            userId: siteSupportTeamMemberUser.id,
        };
    }

    public async delete(): Promise<void> {}

    private async getAllGroupPolicyJumpoints(groupPolicyId: number): Promise<GroupPolicyJumpoint[]> {
        return await PaginationUtility.queryUntilLastPage<GroupPolicyJumpoint>((pageNumber) =>
            this.queryBus.execute<RetrieveGroupPolicyJumpointsQuery, GroupPolicyJumpoint[]>(
                new RetrieveGroupPolicyJumpointsQuery(
                    this.transactionId,
                    SiteSupportTeamMemberWorkflow.MAX_PAGE_RETRIEVAL_SIZE,
                    pageNumber,
                    groupPolicyId,
                ),
            ),
        );
    }

    private async getAllGroupPolicyJumpGroups(groupPolicyId: number): Promise<GroupPolicyJumpGroup[]> {
        return await PaginationUtility.queryUntilLastPage<GroupPolicyJumpGroup>((pageNumber) =>
            this.queryBus.execute<RetrieveGroupPolicyJumpGroupsQuery, GroupPolicyJumpGroup[]>(
                new RetrieveGroupPolicyJumpGroupsQuery(
                    this.transactionId,
                    SiteSupportTeamMemberWorkflow.MAX_PAGE_RETRIEVAL_SIZE,
                    pageNumber,
                    groupPolicyId,
                ),
            ),
        );
    }
}
