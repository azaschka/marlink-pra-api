export class SyncGroupPolicyJumpointsAfterGroupPoliciesSyncedCommand {
    public readonly commandType = 'sync-group-policy-jumpoints-after-group-policies-synced';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly createdGroupPolicyIds: number[],
        public readonly updatedGroupPolicyIds: number[],
        public readonly deletedGroupPolicyIds: number[],
    ) {}
}
