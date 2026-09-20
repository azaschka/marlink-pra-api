import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
    AddMemberToGroupPolicyCommand,
    RemoveMemberFromGroupPolicyCommand,
} from '../../../group-policy-member/commands';
import { GroupPolicyMember } from '../../../group-policy-member/models';
import { RetrieveGroupPolicyMembersQuery } from '../../../group-policy-member/queries';
import { ErrorProcessorUtility, PaginationUtility } from '../../../shared/utilities';
import { ModifyUserGroupPoliciesCommand } from '../../../user-group-policy/commands';
import { UserGroupPolicy } from '../../../user-group-policy/models';
import { UserSourceType } from '../../../user/enums';
import { User } from '../../../user/models';
import { SiteUserType } from '../../enums';
import { GroupPolicyAssignmentFailedException, GroupPolicyAssignmentFailure } from '../../exceptions';

/**
 * Applies group policy memberships for a site user, choosing the API that works for the user's source type.
 *
 * R3.2-A003, 3.1(1): PATCH /user/{id}/group-policy-changes applies to local users only. For an externally
 * provisioned user the same outcome has to be produced through POST and DELETE /group-policy/{id}/member,
 * iterated once per group policy.
 *
 * The path is chosen by the source type supplied with the ingestion data, not by the security provider on the
 * resolved user. Whether BeyondTrust reports a security provider for local accounts as well is not verified
 * yet, and deriving the path from it would silently move every local user onto the untested code path.
 * BaseSiteUserWorkflow verifies that a user supplied as external really is externally provisioned, so the
 * declared source type is a trustworthy signal by the time it arrives here.
 */
export class UserGroupPolicyAssignmentWorkflow {
    private static readonly MAX_MEMBERS_RETRIEVED_PER_PAGE = 100;

    constructor(
        private readonly queryBus: QueryBus,
        private readonly commandBus: CommandBus,
        private readonly transactionId: string,
        private readonly customerBeyondtrustInstanceId: number,
    ) {}

    /**
     * @throws GroupPolicyAssignmentFailedException if one or more group policies could not be applied
     */
    public async modify(
        siteUserType: SiteUserType,
        sourceType: UserSourceType,
        user: User,
        groupPolicyIdsToAdd: number[],
        groupPolicyIdsToRemove: number[],
    ): Promise<void> {
        if (groupPolicyIdsToAdd.length === 0 && groupPolicyIdsToRemove.length === 0) {
            return;
        }

        if (sourceType === UserSourceType.Internal) {
            await this.commandBus.execute<ModifyUserGroupPoliciesCommand, UserGroupPolicy[]>(
                new ModifyUserGroupPoliciesCommand(
                    this.transactionId,
                    this.customerBeyondtrustInstanceId,
                    user.id,
                    groupPolicyIdsToAdd,
                    groupPolicyIdsToRemove,
                ),
            );

            return;
        }

        const failures: GroupPolicyAssignmentFailure[] = [];

        for (const groupPolicyId of groupPolicyIdsToAdd) {
            await this.tryApply(failures, groupPolicyId, 'add', () => this.addMember(user, groupPolicyId));
        }

        for (const groupPolicyId of groupPolicyIdsToRemove) {
            await this.tryApply(failures, groupPolicyId, 'remove', () => this.removeMember(user, groupPolicyId));
        }

        if (failures.length > 0) {
            throw new GroupPolicyAssignmentFailedException(siteUserType, user.id, failures);
        }
    }

    private async tryApply(
        failures: GroupPolicyAssignmentFailure[],
        groupPolicyId: number,
        operation: 'add' | 'remove',
        apply: () => Promise<void>,
    ): Promise<void> {
        try {
            await apply();
        } catch (error) {
            console.error(
                `[${this.transactionId}] Failed to ${operation} group policy ${groupPolicyId} membership:`,
                error,
            );
            failures.push({
                groupPolicyId: groupPolicyId,
                operation: operation,
                message: ErrorProcessorUtility.stringify(error),
            });
        }
    }

    /** Adding an existing membership again would be rejected by BeyondTrust, so it is checked first. */
    private async addMember(user: User, groupPolicyId: number): Promise<void> {
        if (await this.findMember(user, groupPolicyId)) {
            return;
        }

        if (user.securityProviderId === undefined || user.securityProviderId === null) {
            throw new Error(
                `User ${user.id} has no security provider, which is required to add a non-local group policy member.`,
            );
        }

        await this.commandBus.execute<AddMemberToGroupPolicyCommand, GroupPolicyMember>(
            new AddMemberToGroupPolicyCommand(
                this.transactionId,
                this.customerBeyondtrustInstanceId,
                groupPolicyId,
                user.id,
                user.securityProviderId,
            ),
        );
    }

    /**
     * Removal is addressed by member id, not by user id, so the membership has to be looked up first. A
     * membership that is already gone is not an error: repeated ingestion runs must not fail on it.
     */
    private async removeMember(user: User, groupPolicyId: number): Promise<void> {
        const member = await this.findMember(user, groupPolicyId);

        if (!member) {
            return;
        }

        await this.commandBus.execute<RemoveMemberFromGroupPolicyCommand, void>(
            new RemoveMemberFromGroupPolicyCommand(
                this.transactionId,
                this.customerBeyondtrustInstanceId,
                groupPolicyId,
                member.memberId,
            ),
        );
    }

    private async findMember(user: User, groupPolicyId: number): Promise<GroupPolicyMember | null> {
        const members = await PaginationUtility.queryUntilLastPage<GroupPolicyMember>((pageNumber) =>
            this.queryBus.execute<RetrieveGroupPolicyMembersQuery, GroupPolicyMember[]>(
                new RetrieveGroupPolicyMembersQuery(
                    this.transactionId,
                    this.customerBeyondtrustInstanceId,
                    UserGroupPolicyAssignmentWorkflow.MAX_MEMBERS_RETRIEVED_PER_PAGE,
                    pageNumber,
                    groupPolicyId,
                ),
            ),
        );

        return members.find((member) => member.userId === user.id) ?? null;
    }
}
