export class SyncProtocolTunnelJumpsCommand {
    public readonly commandType = 'sync-protocol-tunnel-jumps';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
    ) {}
}
