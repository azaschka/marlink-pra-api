export class SyncJumpClientInstallersCommand {
    public readonly commandType = 'sync-jump-client-installers';

    constructor(public readonly transactionId: string) {}
}
