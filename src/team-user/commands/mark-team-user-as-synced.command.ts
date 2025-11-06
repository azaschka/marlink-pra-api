export class MarkTeamUserAsSyncedCommand {
    public readonly commandType = 'mark-team-user-as-synced';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly teamId: number,
        public readonly userId: number,
    ) {}
}
