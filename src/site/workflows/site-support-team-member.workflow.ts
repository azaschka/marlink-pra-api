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
import { User } from '../../user/models';
import { SiteSupportTeamAccessLevel } from '../enums';
import { PartialSiteSupportTeamMember, PartialSiteSupportTeamMemberWithUserId, SiteSupportTeamMember } from '../models';
import { RetrieveSiteSupportTeamMembersQuery } from '../queries';
import {
    AdministratorGroupPolicyWorkflow,
    FullAccessGroupPolicyWorkflow,
    LimitedAccessGroupPolicyWorkflow,
    OperatorGroupPolicyWorkflow,
    SupportTeamGroupPolicyWorkflow,
} from './group-policies';
import { SupportTeamJumpGroupWorkflow } from './jump-groups';
import { JumpointsWorkflow } from './jumpoints';
import { SiteSupportTeamMemberUserWorkflow } from './users';

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

    public async delete(): Promise<void> {
        const operatorGroupPolicy = await this.operatorGroupPolicyWorkflow.getOrCreate();
        const supportTeamGroupPolicy = await this.supportTeamGroupPolicyWorkflow.getOrCreate();
        const limitedAccessGroupPolicy = await this.limitedAccessGroupPolicyWorkflow.getOrCreate();
        const fullAccessGroupPolicy = await this.fullAccessGroupPolicyWorkflow.getOrCreate();
        const siteSupportTeamMemberUser = await this.siteSupportTeamMemberUserWorkflow.getOrCreate();
        const isSiteSupportTeamMemberAssociatedWithMultipleSites =
            await this.isSiteSupportTeamMemberAssociatedWithMultipleSites(siteSupportTeamMemberUser);

        // Remove the user from the support team group policy and operator group policy
        // and from the limited access or full access group policy based on the access level
        // If the site support team member is associated with multiple sites, we only remove them from the operator group policy
        await this.commandBus.execute<ModifyUserGroupPoliciesCommand, UserGroupPolicy[]>(
            new ModifyUserGroupPoliciesCommand(
                this.transactionId,
                siteSupportTeamMemberUser.id,
                [],
                isSiteSupportTeamMemberAssociatedWithMultipleSites
                    ? [operatorGroupPolicy.id]
                    : [
                          supportTeamGroupPolicy.id,
                          operatorGroupPolicy.id,
                          this.siteSupportTeamMember.supportTeamAccessLevel === SiteSupportTeamAccessLevel.Full
                              ? fullAccessGroupPolicy.id
                              : limitedAccessGroupPolicy.id,
                      ],
            ),
        );

        // TODO
        // 1. Jumpoint and jump group removal from the group policies.
        // 2. Remove support team group policy and jump group.
        // Perhaps it's customer responsibility since it's way too much harder to apply here (?)
    }

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

    private async isSiteSupportTeamMemberAssociatedWithMultipleSites(siteSupportTeamMemberUser: User) {
        const siteSupportTeamMembers = await this.queryBus.execute<
            RetrieveSiteSupportTeamMembersQuery,
            SiteSupportTeamMember[]
        >(new RetrieveSiteSupportTeamMembersQuery(this.transactionId, 2, 1, siteSupportTeamMemberUser.id));

        return siteSupportTeamMembers.length > 1;
    }
}
