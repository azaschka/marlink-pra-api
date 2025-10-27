export class MarkShellJumpAsSyncedCommand {
    public readonly commandType = 'mark-shell-jump-as-synced';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly id: number,
    ) {}
}
