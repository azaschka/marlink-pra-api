export class MarkTeamAsSyncedCommand {
    public readonly commandType = 'mark-team-as-synced';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly id: number,
    ) {}
}
