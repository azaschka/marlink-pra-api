import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { BusinessUnit } from '../../../beyondtrust-instance/enums';
import { RemoveUserFromGroupPolicyCommand } from '../../../group-policy-member/commands';
import { GroupPolicyUserRemoval } from '../../../group-policy-member/models';
import { GroupPolicy } from '../../../group-policy/models';
import { ErrorProcessorUtility } from '../../../shared/utilities';
import { UserSourceType } from '../../../user/enums';
import { SiteUserType } from '../../enums';
import { BuSamlDefaultGroupPolicyRetainedException, GroupPolicyAssignmentFailedException } from '../../exceptions';
import { BuGroupPolicyLookupWorkflow } from './bu-group-policy-lookup.workflow';

/**
 * Maps each Business Unit to the default group policy of its externally provisioned (SAML) users. These policies
 * are created manually on each BeyondTrust appliance, and BeyondTrust adds a user of an identity provider to the
 * policy of its Business Unit when the user signs in for the first time. The platform never adds members.
 *
 * The membership lets a BU Admin find a new external user that has no site role yet: the PRA Console shows a
 * BeyondTrust user to a BU Admin when one of the user's group policies belongs to that Business Unit, and uses
 * the same names for it (pra-console, BU_SAML_DEFAULT_GP_MAP in shared/helpers/pra-data-filter.ts). Keep both in
 * sync.
 */
export const BU_SAML_DEFAULT_GP_MAP: Record<BusinessUnit, string> = {
    [BusinessUnit.OA]: 'GP_OMNIACCESS_SAML_DEFAULT',
    [BusinessUnit.MT]: 'GP_MARITIME_SAML_DEFAULT',
    [BusinessUnit.EG]: 'GP_EEG_SAML_DEFAULT',
    [BusinessUnit.TE]: 'GP_TELEMAR_SAML_DEFAULT',
    [BusinessUnit.MC]: 'GP_CYBER_SAML_DEFAULT',
};

/** What removeFrom() needs of a site user whose role is in place. */
export interface BuSamlDefaultGroupPolicySiteUser {
    sourceType: UserSourceType;
    email: string;
    userId: number;
}

/**
 * Finds (never creates) the SAML default group policy of the customer's Business Unit and takes a site user out of it
 * (EXT-21, EXT-24, EXT-25, MARLINKPRA-81). The caller decides when: only after the policies of the user's roles are
 * assigned.
 *
 * Local users are never members: BeyondTrust only adds users of an identity provider, and their site policies
 * identify the Business Unit through the customer name.
 */
export class BuSamlDefaultGroupPolicyWorkflow extends BuGroupPolicyLookupWorkflow {
    constructor(
        queryBus: QueryBus,
        private readonly commandBus: CommandBus,
        transactionId: string,
        customerBusinessUnit: BusinessUnit,
        customerBeyondtrustInstanceId: number,
    ) {
        super(queryBus, transactionId, customerBusinessUnit, customerBeyondtrustInstanceId);
    }

    public get groupPolicyName(): string | undefined {
        return BU_SAML_DEFAULT_GP_MAP[this.customerBusinessUnit];
    }

    protected get description(): string {
        return 'BU SAML default GP';
    }

    /**
     * The Business Unit's SAML default policy for an external user, none for a local user. Null as well when the
     * policy does not exist on the BeyondTrust instance.
     */
    public async getFor(sourceType: UserSourceType): Promise<GroupPolicy | null> {
        if (sourceType !== UserSourceType.External) {
            return null;
        }

        return await this.get();
    }

    /**
     * Takes an external user out of the policy. A local user and a policy that does not exist are nothing to do.
     *
     * @returns what the report should say when the user may still hold the policy, otherwise null
     * @throws GroupPolicyAssignmentFailedException if the removal failed
     */
    public async removeFrom(
        siteUserType: SiteUserType,
        siteUser: BuSamlDefaultGroupPolicySiteUser,
    ): Promise<BuSamlDefaultGroupPolicyRetainedException | null> {
        const groupPolicy = await this.getFor(siteUser.sourceType);

        if (!groupPolicy) {
            return null;
        }

        const removal = await this.remove(siteUserType, siteUser, groupPolicy.id);
        const reason = BuSamlDefaultGroupPolicyWorkflow.describeRetained(removal);

        if (!reason) {
            return null;
        }

        const retained = new BuSamlDefaultGroupPolicyRetainedException(
            siteUserType,
            siteUser.email,
            groupPolicy.name,
            reason,
        );
        console.warn(`[${this.transactionId}] ${retained.message}`);

        return retained;
    }

    private async remove(
        siteUserType: SiteUserType,
        siteUser: BuSamlDefaultGroupPolicySiteUser,
        groupPolicyId: number,
    ): Promise<GroupPolicyUserRemoval> {
        try {
            return await this.commandBus.execute<RemoveUserFromGroupPolicyCommand, GroupPolicyUserRemoval>(
                new RemoveUserFromGroupPolicyCommand(
                    this.transactionId,
                    this.customerBeyondtrustInstanceId,
                    groupPolicyId,
                    siteUser.userId,
                    true,
                ),
            );
        } catch (error) {
            throw new GroupPolicyAssignmentFailedException(siteUserType, siteUser.email, siteUser.userId, [
                { groupPolicyId: groupPolicyId, operation: 'remove', message: ErrorProcessorUtility.stringify(error) },
            ]);
        }
    }

    private static describeRetained(removal: GroupPolicyUserRemoval): string | null {
        if (removal.stillHoldsGroupPolicy === true) {
            return (
                'BeyondTrust still lists it after the removal step. It can come from the default group policy of the ' +
                'security provider or from a group mapping, which cannot be removed per user.'
            );
        }

        if (removal.stillHoldsGroupPolicy === null && !removal.removed) {
            return 'BeyondTrust shows no direct membership to remove, and whether it still lists the policy could not be determined.';
        }

        return null;
    }
}
