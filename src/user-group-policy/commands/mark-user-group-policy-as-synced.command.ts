export class MarkUserGroupPolicyAsSyncedCommand {
    public readonly commandType = 'mark-user-group-policy-as-synced';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly userId: number,
        public readonly groupPolicyId: number,
    ) {}
}
