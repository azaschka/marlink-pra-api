export class SyncJumpointsCommand {
    public readonly commandType = 'sync-jumpoints';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
    ) {}
}
