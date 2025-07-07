export class SyncUserGroupPoliciesAfterUsersSyncedCommand {
    public readonly commandType = 'sync-user-group-policies-after-users-synced';

    constructor(
        public readonly transactionId: string,
        public readonly createdUserIds: number[],
        public readonly updatedUserIds: number[],
        public readonly deletedUserIds: number[],
    ) {}
}
