export class MarkSessionPolicyAsSyncedCommand {
    public readonly commandType = 'mark-session-policy-as-synced';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly id: number,
    ) {}
}
