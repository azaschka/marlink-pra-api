export class SyncGroupPolicyJumpGroupsAfterGroupPoliciesSyncedCommand {
    public readonly commandType = 'sync-group-policy-jump-groups-after-group-policies-synced';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly createdGroupPolicyIds: number[],
        public readonly updatedGroupPolicyIds: number[],
        public readonly deletedGroupPolicyIds: number[],
    ) {}
}
