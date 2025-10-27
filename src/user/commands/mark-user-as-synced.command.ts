export class MarkUserAsSyncedCommand {
    public readonly commandType = 'mark-user-as-synced';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly id: number,
    ) {}
}
