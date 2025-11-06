export class SyncGroupPoliciesCommand {
    public readonly commandType = 'sync-group-policies';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
    ) {}
}
