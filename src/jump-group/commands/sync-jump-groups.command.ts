export class SyncJumpGroupsCommand {
    public readonly commandType = 'sync-jump-groups';

    constructor(public readonly transactionId: string) {}
}
