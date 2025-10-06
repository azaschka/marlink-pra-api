export class SyncRemoteRdpsCommand {
    public readonly commandType = 'sync-remote-rdps';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
    ) {}
}
