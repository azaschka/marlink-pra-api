export class MarkJumpPolicyAsSyncedCommand {
    public readonly commandType = 'mark-jump-policy-as-synced';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly id: number,
    ) {}
}
