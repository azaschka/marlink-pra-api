export class MarkGroupPolicyJumpGroupAsSyncedCommand {
    public readonly commandType = 'mark-group-policy-jump-group-as-synced';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly groupPolicyId: number,
        public readonly jumpGroupId: number,
    ) {}
}
