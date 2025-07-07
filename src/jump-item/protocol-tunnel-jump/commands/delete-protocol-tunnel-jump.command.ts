export class DeleteProtocolTunnelJumpCommand {
    public readonly commandType = 'delete-protocol-tunnel-jump';

    constructor(
        public readonly transactionId: string,
        public readonly id: number,
    ) {}
}
