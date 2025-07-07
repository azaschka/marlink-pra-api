export class SyncShellJumpsCommand {
    public readonly commandType = 'sync-shell-jumps';

    constructor(public readonly transactionId: string) {}
}
