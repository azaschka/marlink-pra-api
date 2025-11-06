export class ModifyUserGroupPoliciesCommand {
    public readonly commandType = 'modify-user-group-policies';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly userId: number,
        public readonly groupPolicyIdsToAdd: number[],
        public readonly groupPolicyIdsToRemove: number[],
    ) {}
}
