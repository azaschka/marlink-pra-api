export class MarkJumpClientAsSyncedCommand {
    public readonly commandType = 'mark-jump-client-as-synced';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly id: number,
    ) {}
}
