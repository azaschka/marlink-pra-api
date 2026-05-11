import { QueryBus } from '@nestjs/cqrs';
import { BusinessUnit } from '../../../beyondtrust-instance/enums';
import { GroupPolicy } from '../../../group-policy/models';
import { RetrieveGroupPoliciesQuery } from '../../../group-policy/queries';

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

export class BuSupportGroupPolicyWorkflow {
    private cachedGroupPolicy: GroupPolicy | null | undefined = undefined; // undefined = not yet fetched

    /**
     * Returns the exact GP name for this Business Unit per R3.1-P003,
     * or undefined if the BU has no mapping (should not happen in practice).
     */
    public get groupPolicyName(): string | undefined {
        return BU_OPERATORS_GP_MAP[this.customerBusinessUnit];
    }

    constructor(
        private readonly queryBus: QueryBus,
        private readonly transactionId: string,
        private readonly customerBusinessUnit: BusinessUnit,
        private readonly customerBeyondtrustInstanceId: number,
    ) {}

    /**
     * Finds (never creates) the BU Operators Group Policy for this Business Unit
     * using the exact name from R3.1-P003 (e.g. "GP_OMNIACCESS_OPERATORS" for OA).
     * Result is cached per workflow instance to avoid repeated API calls.
     * Returns null if the policy does not yet exist on the BeyondTrust instance.
     */
    public async get(): Promise<GroupPolicy | null> {
        if (this.cachedGroupPolicy !== undefined) {
            return this.cachedGroupPolicy;
        }

        const gpName = this.groupPolicyName;

        if (!gpName) {
            console.warn(
                `[${this.transactionId}] No BU Operators GP mapping found for BusinessUnit "${this.customerBusinessUnit}" (R3.1-P003). Skipping assignment.`,
            );
            this.cachedGroupPolicy = null;
            return null;
        }

        const groupPolicies = await this.queryBus.execute<RetrieveGroupPoliciesQuery, GroupPolicy[]>(
            new RetrieveGroupPoliciesQuery(this.transactionId, this.customerBeyondtrustInstanceId, 1, 1, gpName),
        );

        this.cachedGroupPolicy = groupPolicies[0] ?? null;
        return this.cachedGroupPolicy;
    }
}
