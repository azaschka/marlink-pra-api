export class MarkRemoteVncAsSyncedCommand {
    public readonly commandType = 'mark-remote-vnc-as-synced';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly id: number,
    ) {}
}
