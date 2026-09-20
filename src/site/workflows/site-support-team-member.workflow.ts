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
import { SiteSupportTeamAccessLevel, SiteUserType } from '../enums';
import { UserSourceType } from '../../user/enums';
import { UserNotFoundException } from '../exceptions';
import { PartialSiteSupportTeamMember, PartialSiteSupportTeamMemberWithUserId, SiteSupportTeamMember } from '../models';
import { RetrieveSiteSupportTeamMembersByUserIdQuery } from '../queries';
import {
    AdministratorGroupPolicyWorkflow,
    BuSupportGroupPolicyWorkflow,
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
        private readonly customerBeyondtrustInstanceId: number,
        private readonly administratorGroupPolicyWorkflow: AdministratorGroupPolicyWorkflow,
        private readonly operatorGroupPolicyWorkflow: OperatorGroupPolicyWorkflow,
        private readonly jumpointsWorkflow: JumpointsWorkflow,
        private readonly buSupportGroupPolicyWorkflow: BuSupportGroupPolicyWorkflow,
    ) {
        this.siteSupportTeamMemberUserWorkflow = new SiteSupportTeamMemberUserWorkflow(
            this.queryBus,
            this.commandBus,
            this.transactionId,
            this.siteSupportTeamMember,
            this.customerBeyondtrustInstanceId,
        );

        this.supportTeamGroupPolicyWorkflow = new SupportTeamGroupPolicyWorkflow(
            this.queryBus,
            this.commandBus,
            this.transactionId,
            this.siteSupportTeamMember,
            this.customerName,
            this.customerBeyondtrustInstanceId,
        );

        this.supportTeamJumpGroupWorkflow = new SupportTeamJumpGroupWorkflow(
            this.queryBus,
            this.commandBus,
            this.transactionId,
            this.siteSupportTeamMember,
            this.customerName,
            this.customerBeyondtrustInstanceId,
        );

        this.limitedAccessGroupPolicyWorkflow = new LimitedAccessGroupPolicyWorkflow(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            this.transactionId,
            this.customerBeyondtrustInstanceId,
        );

        this.fullAccessGroupPolicyWorkflow = new FullAccessGroupPolicyWorkflow(
            this.appConfigService,
            this.queryBus,
            this.commandBus,
            this.transactionId,
            this.customerBeyondtrustInstanceId,
        );
    }

    /**
     * @throws UserNotFoundException if the site support team member user cannot be found
     * @throws MultipleUsersFoundException if more than one user is found with the same email or username
     */
    public async getOrCreate(): Promise<PartialSiteSupportTeamMemberWithUserId> {
        const administratorGroupPolicy = await this.administratorGroupPolicyWorkflow.getOrCreate();
        const operatorGroupPolicy = await this.operatorGroupPolicyWorkflow.getOrCreate();
        const supportTeamGroupPolicy = await this.supportTeamGroupPolicyWorkflow.getOrCreate();
        const limitedAccessGroupPolicy = await this.limitedAccessGroupPolicyWorkflow.getOrCreate();
        const fullAccessGroupPolicy = await this.fullAccessGroupPolicyWorkflow.getOrCreate();
        const supportTeamJumpGroup = await this.supportTeamJumpGroupWorkflow.getOrCreate();
        const jumpoints = await this.jumpointsWorkflow.getOrCreate();

        // Add jumpoint to the support team group policy
        const groupPolicyJumpoints = await this.getAllGroupPolicyJumpoints(supportTeamGroupPolicy.id);
        for (const jumpoint of jumpoints) {
            // Skip if the jumpoint is already added to the group policy
            if (groupPolicyJumpoints.some((groupPolicyJumpoint) => groupPolicyJumpoint.jumpointId === jumpoint.id)) {
                continue;
            }

            await this.commandBus.execute<AddJumpointToGroupPolicyCommand, GroupPolicyJumpoint>(
                new AddJumpointToGroupPolicyCommand(
                    this.transactionId,
                    this.customerBeyondtrustInstanceId,
                    supportTeamGroupPolicy.id,
                    jumpoint.id,
                ),
            );
        }

        // Resolve the BU Support Group Policy (may be null if not yet created, non-blocking)
        const buGroupPolicy = await this.buSupportGroupPolicyWorkflow.get();

        // Add jump group to: support team GP, administrator GP, and (if found) BU Support GP
        const jumpGroupTargetPolicies = [
            supportTeamGroupPolicy,
            administratorGroupPolicy,
            ...(buGroupPolicy ? [buGroupPolicy] : []),
        ];

        for (const groupPolicy of jumpGroupTargetPolicies) {
            const groupPolicyJumpGroups = await this.getAllGroupPolicyJumpGroups(groupPolicy.id);

            if (groupPolicyJumpGroups.some((gj) => gj.jumpGroupId === supportTeamJumpGroup.id)) {
                continue;
            }

            await this.commandBus.execute<AddJumpGroupToGroupPolicyCommand, GroupPolicyJumpGroup>(
                new AddJumpGroupToGroupPolicyCommand(
                    this.transactionId,
                    this.customerBeyondtrustInstanceId,
                    groupPolicy.id,
                    supportTeamJumpGroup.id,
                ),
            );
        }

        const siteSupportTeamMemberUser = await this.siteSupportTeamMemberUserWorkflow.getOrCreate();

        if (!siteSupportTeamMemberUser) {
            throw new UserNotFoundException(
                SiteUserType.SiteSupportTeamMember,
                undefined,
                this.siteSupportTeamMember.email,
            );
        }

        // Assign the support team member to their group policies:
        //   - {CUSTOMER}_{SUPPORT_TEAM_NAME}  — site/team-specific support group policy
        //   - OPERATORS_{CUSTOMER}            — customer-specific operator group policy
        //   - LIMITED_ACCESS                  — global limited access policy (accessLevel: limited)
        //   - FULL_ACCESS                     — global full access policy   (accessLevel: full)
        await this.commandBus.execute<ModifyUserGroupPoliciesCommand, UserGroupPolicy[]>(
            new ModifyUserGroupPoliciesCommand(
                this.transactionId,
                this.customerBeyondtrustInstanceId,
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

        return {
            ...this.siteSupportTeamMember,
            userId: siteSupportTeamMemberUser.id,
        };
    }

    /**
     * @throws UserNotFoundException if the site support team member user cannot be found
     * @throws MultipleUsersFoundException if more than one user is found with the same email or username
     */
    public async delete(): Promise<void> {
        const operatorGroupPolicy = await this.operatorGroupPolicyWorkflow.getOrCreate();
        const supportTeamGroupPolicy = await this.supportTeamGroupPolicyWorkflow.getOrCreate();
        const limitedAccessGroupPolicy = await this.limitedAccessGroupPolicyWorkflow.getOrCreate();
        const fullAccessGroupPolicy = await this.fullAccessGroupPolicyWorkflow.getOrCreate();
        const siteSupportTeamMemberUser = await this.siteSupportTeamMemberUserWorkflow.getOrCreate();

        if (!siteSupportTeamMemberUser) {
            throw new UserNotFoundException(
                SiteUserType.SiteSupportTeamMember,
                undefined,
                this.siteSupportTeamMember.email,
            );
        }

        const isSiteSupportTeamMemberAssociatedWithMultipleSites =
            await this.isSiteSupportTeamMemberAssociatedWithMultipleSites(siteSupportTeamMemberUser);

        // Remove the support team member from their group policies.
        // If the user belongs to multiple sites, only OPERATORS_{CUSTOMER} is removed (site-specific data stays).
        // If this is their only site, all three policies are removed: the support team group policy,
        // OPERATORS_{CUSTOMER}, and whichever access policy (LIMITED_ACCESS or FULL_ACCESS) they held.
        await this.commandBus.execute<ModifyUserGroupPoliciesCommand, UserGroupPolicy[]>(
            new ModifyUserGroupPoliciesCommand(
                this.transactionId,
                this.customerBeyondtrustInstanceId,
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

        // The site support team member user is only deleted if they are not associated with any other sites and they are an internal user.
        // External users are not managed by the system, so we don't delete them.
        if (
            !isSiteSupportTeamMemberAssociatedWithMultipleSites &&
            this.siteSupportTeamMember.sourceType === UserSourceType.Internal
        ) {
            await this.siteSupportTeamMemberUserWorkflow.delete();
        }

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
                    this.customerBeyondtrustInstanceId,
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
                    this.customerBeyondtrustInstanceId,
                    SiteSupportTeamMemberWorkflow.MAX_PAGE_RETRIEVAL_SIZE,
                    pageNumber,
                    groupPolicyId,
                ),
            ),
        );
    }

    private async isSiteSupportTeamMemberAssociatedWithMultipleSites(siteSupportTeamMemberUser: User) {
        const siteSupportTeamMembers = await this.queryBus.execute<
            RetrieveSiteSupportTeamMembersByUserIdQuery,
            SiteSupportTeamMember[]
        >(new RetrieveSiteSupportTeamMembersByUserIdQuery(this.transactionId, 2, 1, siteSupportTeamMemberUser.id));

        return siteSupportTeamMembers.length > 1;
    }
}
