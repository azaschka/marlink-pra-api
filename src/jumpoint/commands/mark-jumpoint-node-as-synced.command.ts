export class MarkJumpointNodeAsSyncedCommand {
    public readonly commandType = 'mark-jumpoint-node-as-synced';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly jumpointId: number,
        public readonly jumpointNodeId: number,
    ) {}
}
