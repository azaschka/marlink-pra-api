import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ErrorProcessorUtility, PaginationUtility } from '../../shared/utilities';
import { User } from '../../user/models';
import { AddMemberToGroupPolicyCommand, RemoveMemberFromGroupPolicyCommand } from '../commands';
import { GroupPolicyMember } from '../models';
import { RetrieveGroupPolicyMembersQuery } from '../queries';

export interface GroupPolicyMembershipFailure {
    groupPolicyId: number;
    operation: 'add' | 'remove';
    message: string;
}

export interface GroupPolicyMembershipOutcome {
    /** Group policies the user is a direct member of after the call (newly added or already present). */
    addedGroupPolicyIds: number[];
    /** Group policies the user is no longer a direct member of (removed or already absent). */
    removedGroupPolicyIds: number[];
    failures: GroupPolicyMembershipFailure[];
}

/**
 * Adds a user to and removes a user from group policies through POST and DELETE /group-policy/{id}/member.
 *
 * R3.2-A003, 3.1(1): PATCH /user/{id}/group-policy-changes applies to local users only. For an externally
 * provisioned user the same outcome is produced per group policy through the member endpoints. Every group policy
 * is attempted; failures are collected and returned instead of stopping at the first one, so a repeated call only
 * has to redo what failed. Existing memberships are not added again and missing ones are not an error, which keeps
 * the operation idempotent.
 *
 * Only direct user memberships are touched. Memberships of identity provider groups in the same group policy are
 * left alone, so access that an administrator granted through a group mapping is not affected.
 */
export class UserGroupPolicyMembershipWorkflow {
    private static readonly MAX_MEMBERS_RETRIEVED_PER_PAGE = 100;

    constructor(
        private readonly queryBus: QueryBus,
        private readonly commandBus: CommandBus,
        private readonly transactionId: string,
        private readonly tenantId: number,
    ) {}

    public async apply(
        user: User,
        groupPolicyIdsToAdd: number[],
        groupPolicyIdsToRemove: number[],
    ): Promise<GroupPolicyMembershipOutcome> {
        const outcome: GroupPolicyMembershipOutcome = {
            addedGroupPolicyIds: [],
            removedGroupPolicyIds: [],
            failures: [],
        };

        for (const groupPolicyId of groupPolicyIdsToAdd) {
            if (await this.tryApply(outcome, groupPolicyId, 'add', () => this.addMember(user, groupPolicyId))) {
                outcome.addedGroupPolicyIds.push(groupPolicyId);
            }
        }

        for (const groupPolicyId of groupPolicyIdsToRemove) {
            if (await this.tryApply(outcome, groupPolicyId, 'remove', () => this.removeMember(user, groupPolicyId))) {
                outcome.removedGroupPolicyIds.push(groupPolicyId);
            }
        }

        return outcome;
    }

    private async tryApply(
        outcome: GroupPolicyMembershipOutcome,
        groupPolicyId: number,
        operation: 'add' | 'remove',
        apply: () => Promise<void>,
    ): Promise<boolean> {
        try {
            await apply();

            return true;
        } catch (error) {
            console.error(
                `[${this.transactionId}] Failed to ${operation} group policy ${groupPolicyId} membership:`,
                error,
            );
            outcome.failures.push({
                groupPolicyId: groupPolicyId,
                operation: operation,
                message: ErrorProcessorUtility.stringify(error),
            });

            return false;
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
                this.tenantId,
                groupPolicyId,
                user.id,
                user.securityProviderId,
            ),
        );
    }

    /**
     * Removal is addressed by member id, not by user id, so the membership has to be looked up first. A
     * membership that is already gone is not an error: repeated runs must not fail on it.
     */
    private async removeMember(user: User, groupPolicyId: number): Promise<void> {
        const member = await this.findMember(user, groupPolicyId);

        if (!member) {
            return;
        }

        await this.commandBus.execute<RemoveMemberFromGroupPolicyCommand, void>(
            new RemoveMemberFromGroupPolicyCommand(this.transactionId, this.tenantId, groupPolicyId, member.memberId),
        );
    }

    private async findMember(user: User, groupPolicyId: number): Promise<GroupPolicyMember | null> {
        const members = await PaginationUtility.queryUntilLastPage<GroupPolicyMember>((pageNumber) =>
            this.queryBus.execute<RetrieveGroupPolicyMembersQuery, GroupPolicyMember[]>(
                new RetrieveGroupPolicyMembersQuery(
                    this.transactionId,
                    this.tenantId,
                    UserGroupPolicyMembershipWorkflow.MAX_MEMBERS_RETRIEVED_PER_PAGE,
                    pageNumber,
                    groupPolicyId,
                ),
            ),
        );

        return members.find((member) => member.userId === user.id) ?? null;
    }
}
