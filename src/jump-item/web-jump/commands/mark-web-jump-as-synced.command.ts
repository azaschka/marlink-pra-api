export class MarkWebJumpAsSyncedCommand {
    public readonly commandType = 'mark-web-jump-as-synced';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly id: number,
    ) {}
}
