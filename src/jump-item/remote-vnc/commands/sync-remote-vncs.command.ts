export class SyncRemoteVncsCommand {
    public readonly commandType = 'sync-remote-vncs';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
    ) {}
}
