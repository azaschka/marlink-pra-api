import { BusinessUnit } from '../../../beyondtrust-instance/enums';
import { BuGroupPolicyLookupWorkflow } from './bu-group-policy-lookup.workflow';

/**
 * Maps each Business Unit to its dedicated BU Operators Group Policy name
 * as defined in R3.1-P003. These policies are created manually on each
 * BeyondTrust appliance and must exist before site onboarding can complete.
 */
const BU_OPERATORS_GP_MAP: Record<BusinessUnit, string> = {
    [BusinessUnit.OA]: 'GP_OMNIACCESS_OPERATORS',
    [BusinessUnit.MT]: 'GP_MARITIME_OPERATORS',
    [BusinessUnit.EG]: 'GP_EEG_OPERATORS',
    [BusinessUnit.TE]: 'GP_TELEMAR_OPERATORS',
    [BusinessUnit.MC]: 'GP_CYBER_OPERATORS',
};

/**
 * Finds (never creates) the BU Operators Group Policy for a Business Unit using the exact name from R3.1-P003
 * (e.g. "GP_OMNIACCESS_OPERATORS" for OA).
 */
export class BuSupportGroupPolicyWorkflow extends BuGroupPolicyLookupWorkflow {
    public get groupPolicyName(): string | undefined {
        return BU_OPERATORS_GP_MAP[this.customerBusinessUnit];
    }

    protected get description(): string {
        return 'BU Operators GP (R3.1-P003)';
    }
}
