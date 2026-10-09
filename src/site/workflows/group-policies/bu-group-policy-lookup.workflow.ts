import { QueryBus } from '@nestjs/cqrs';
import { BusinessUnit } from '../../../beyondtrust-instance/enums';
import { GroupPolicy } from '../../../group-policy/models';
import { RetrieveGroupPoliciesQuery } from '../../../group-policy/queries';

/**
 * Looks up a group policy that exists once per Business Unit and is created manually on each BeyondTrust
 * appliance. Such a policy is found, never created: the platform does not own it.
 *
 * Subclasses supply the name per Business Unit. The result is cached per workflow instance, because the same
 * instance is shared by every user workflow of one ingestion run.
 */
export abstract class BuGroupPolicyLookupWorkflow {
    private cachedGroupPolicy: GroupPolicy | null | undefined = undefined; // undefined = not yet fetched

    constructor(
        private readonly queryBus: QueryBus,
        protected readonly transactionId: string,
        protected readonly customerBusinessUnit: BusinessUnit,
        private readonly customerBeyondtrustInstanceId: number,
    ) {}

    /** The exact group policy name for this Business Unit, or undefined if the Business Unit has no mapping. */
    public abstract get groupPolicyName(): string | undefined;

    /** Used in log output only, for example "BU Operators GP (R3.1-P003)". */
    protected abstract get description(): string;

    public get businessUnit(): BusinessUnit {
        return this.customerBusinessUnit;
    }

    /** Returns null if the policy does not exist on the BeyondTrust instance. */
    public async get(): Promise<GroupPolicy | null> {
        if (this.cachedGroupPolicy !== undefined) {
            return this.cachedGroupPolicy;
        }

        const groupPolicyName = this.groupPolicyName;

        if (!groupPolicyName) {
            console.warn(
                `[${this.transactionId}] No ${this.description} mapping found for BusinessUnit "${this.customerBusinessUnit}". Skipping assignment.`,
            );
            this.cachedGroupPolicy = null;

            return null;
        }

        const groupPolicies = await this.queryBus.execute<RetrieveGroupPoliciesQuery, GroupPolicy[]>(
            new RetrieveGroupPoliciesQuery(
                this.transactionId,
                this.customerBeyondtrustInstanceId,
                1,
                1,
                groupPolicyName,
            ),
        );

        this.cachedGroupPolicy = groupPolicies[0] ?? null;

        if (!this.cachedGroupPolicy) {
            console.warn(
                `[${this.transactionId}] ${this.description} "${groupPolicyName}" not found on BeyondTrust instance ${this.customerBeyondtrustInstanceId}. Skipping it.`,
            );
        }

        return this.cachedGroupPolicy;
    }
}
