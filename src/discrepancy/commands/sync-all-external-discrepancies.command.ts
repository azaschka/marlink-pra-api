export interface SyncAllExternalResult {
    total: number;
    synced: number;
    failed: number;
}

export class SyncAllExternalDiscrepanciesCommand {
    public readonly commandType = 'sync-all-external-discrepancies';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
    ) {}
}
