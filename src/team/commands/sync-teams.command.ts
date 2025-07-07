export class SyncTeamsCommand {
    public readonly commandType = 'sync-teams';

    constructor(public readonly transactionId: string) {}
}
