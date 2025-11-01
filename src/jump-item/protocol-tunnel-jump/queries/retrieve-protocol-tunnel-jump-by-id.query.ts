export class RetrieveProtocolTunnelJumpByIdQuery {
    public readonly queryType = 'retrieve-protocol-tunnel-jump-by-id';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly id: number,
    ) {}
}
