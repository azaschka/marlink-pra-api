export class MarkGroupPolicyJumpointAsSyncedCommand {
    public readonly commandType = 'mark-group-policy-jumpoint-as-synced';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly groupPolicyId: number,
        public readonly jumpointId: number,
    ) {}
}
