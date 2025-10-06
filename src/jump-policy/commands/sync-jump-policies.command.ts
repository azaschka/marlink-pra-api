export class SyncJumpPoliciesCommand {
    public readonly commandType = 'sync-jump-policies';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
    ) {}
}
