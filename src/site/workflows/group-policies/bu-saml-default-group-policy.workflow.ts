import { BusinessUnit } from '../../../beyondtrust-instance/enums';
import { GroupPolicy } from '../../../group-policy/models';
import { UserSourceType } from '../../../user/enums';
import { BuGroupPolicyLookupWorkflow } from './bu-group-policy-lookup.workflow';

/**
 * Maps each Business Unit to the default group policy of its externally provisioned (SAML) users. These policies
 * are created manually on each BeyondTrust appliance.
 *
 * The membership marks an external user as belonging to the Business Unit: the PRA Console shows a BeyondTrust
 * user to a BU Admin when one of the user's group policies belongs to that Business Unit, and uses the same
 * names for it (pra-console, BU_SAML_DEFAULT_GP_MAP in shared/helpers/pra-data-filter.ts). Keep both in sync.
 */
export const BU_SAML_DEFAULT_GP_MAP: Record<BusinessUnit, string> = {
    [BusinessUnit.OA]: 'GP_OMNIACCESS_SAML_DEFAULT',
    [BusinessUnit.MT]: 'GP_MARITIME_SAML_DEFAULT',
    [BusinessUnit.EG]: 'GP_EEG_SAML_DEFAULT',
    [BusinessUnit.TE]: 'GP_TELEMAR_SAML_DEFAULT',
    [BusinessUnit.MC]: 'GP_CYBER_SAML_DEFAULT',
};

/**
 * Finds (never creates) the SAML default group policy of the customer's Business Unit (EXT-21).
 *
 * Site ingestion adds every externally provisioned site user to it, next to the role-specific policies. Local
 * users are not members: their policies already identify the Business Unit through the customer name.
 */
export class BuSamlDefaultGroupPolicyWorkflow extends BuGroupPolicyLookupWorkflow {
    public get groupPolicyName(): string | undefined {
        return BU_SAML_DEFAULT_GP_MAP[this.customerBusinessUnit];
    }

    protected get description(): string {
        return 'BU SAML default GP';
    }

    /**
     * The policy a site user of the given source type has to be a member of: the Business Unit's SAML default
     * policy for an external user, none for a local user. Null as well when the policy does not exist on the
     * BeyondTrust instance; SiteWorkflow reports that once per ingestion run instead of failing every user.
     */
    public async getFor(sourceType: UserSourceType): Promise<GroupPolicy | null> {
        if (sourceType !== UserSourceType.External) {
            return null;
        }

        return await this.get();
    }
}
