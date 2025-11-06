export class MarkJumpClientInstallerAsSyncedCommand {
    public readonly commandType = 'mark-jump-client-installer-as-synced';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly id: number,
    ) {}
}
