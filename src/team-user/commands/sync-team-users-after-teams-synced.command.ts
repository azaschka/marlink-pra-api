export class SyncTeamUsersAfterTeamsSyncedCommand {
    public readonly commandType = 'sync-team-users-after-teams-synced';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly createdTeamIds: number[],
        public readonly updatedTeamIds: number[],
        public readonly deletedTeamIds: number[],
    ) {}
}
