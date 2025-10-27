export class MarkJumpGroupAsSyncedCommand {
    public readonly commandType = 'mark-jump-group-as-synced';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly id: number,
    ) {}
}
