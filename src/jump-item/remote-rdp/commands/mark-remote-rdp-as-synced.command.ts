export class MarkRemoteRdpAsSyncedCommand {
    public readonly commandType = 'mark-remote-rdp-as-synced';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly id: number,
    ) {}
}
