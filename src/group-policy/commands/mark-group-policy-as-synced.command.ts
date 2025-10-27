export class MarkGroupPolicyAsSyncedCommand {
    public readonly commandType = 'mark-group-policy-as-synced';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly id: number,
    ) {}
}
