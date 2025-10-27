export class MarkProtocolTunnelJumpAsSyncedCommand {
    public readonly commandType = 'mark-protocol-tunnel-jump-as-synced';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly id: number,
    ) {}
}
