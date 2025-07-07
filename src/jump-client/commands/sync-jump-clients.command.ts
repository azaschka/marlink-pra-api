export class SyncJumpClientsCommand {
    public readonly commandType = 'sync-jump-clients';

    constructor(public readonly transactionId: string) {}
}
