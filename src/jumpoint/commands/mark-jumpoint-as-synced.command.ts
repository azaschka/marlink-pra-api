export class MarkJumpointAsSyncedCommand {
    public readonly commandType = 'mark-jumpoint-as-synced';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly id: number,
    ) {}
}
