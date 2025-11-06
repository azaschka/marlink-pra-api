export class SyncJumpClientsCommand {
    public readonly commandType = 'sync-jump-clients';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
    ) {}
}
