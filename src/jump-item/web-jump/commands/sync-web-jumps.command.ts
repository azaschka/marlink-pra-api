export class SyncWebJumpsCommand {
    public readonly commandType = 'sync-web-jumps';

    constructor(public readonly transactionId: string) {}
}
