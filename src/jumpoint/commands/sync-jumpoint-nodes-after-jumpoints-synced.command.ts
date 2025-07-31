export class SyncJumpointNodesAfterJumpointsSyncedCommand {
    public readonly commandType = 'sync-jumpoint-nodes-after-jumpoints-synced';

    constructor(
        public readonly transactionId: string,
        public readonly createdJumpointIds: number[],
        public readonly updatedJumpointIds: number[],
        public readonly deletedJumpointIds: number[],
    ) {}
}
