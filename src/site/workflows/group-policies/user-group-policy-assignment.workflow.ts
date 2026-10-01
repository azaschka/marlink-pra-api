import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { UserGroupPolicyMembershipWorkflow } from '../../../group-policy-member/workflows';
import { ModifyUserGroupPoliciesCommand } from '../../../user-group-policy/commands';
import { UserGroupPolicy } from '../../../user-group-policy/models';
import { UserSourceType } from '../../../user/enums';
import { User } from '../../../user/models';
import { SiteUserType } from '../../enums';
import { GroupPolicyAssignmentFailedException } from '../../exceptions';

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
        email: string,
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

        const outcome = await new UserGroupPolicyMembershipWorkflow(
            this.queryBus,
            this.commandBus,
            this.transactionId,
            this.customerBeyondtrustInstanceId,
        ).apply(user, groupPolicyIdsToAdd, groupPolicyIdsToRemove);

        if (outcome.failures.length > 0) {
            throw new GroupPolicyAssignmentFailedException(siteUserType, email, user.id, outcome.failures);
        }
    }
}
