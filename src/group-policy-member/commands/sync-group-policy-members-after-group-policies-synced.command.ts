export class SyncGroupPolicyMembersAfterGroupPoliciesSyncedCommand {
    public readonly commandType = 'sync-group-policy-members-after-group-policies-synced';

    constructor(
        public readonly transactionId: string,
        public readonly createdGroupPolicyIds: number[],
        public readonly updatedGroupPolicyIds: number[],
        public readonly deletedGroupPolicyIds: number[],
    ) {}
}
