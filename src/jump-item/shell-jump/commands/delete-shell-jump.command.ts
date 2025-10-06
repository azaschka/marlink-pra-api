export class DeleteShellJumpCommand {
    public readonly commandType = 'delete-shell-jump';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly id: number,
    ) {}
}
