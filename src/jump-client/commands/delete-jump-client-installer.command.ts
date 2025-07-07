export class DeleteJumpClientInstallerCommand {
    public readonly commandType = 'delete-jump-client-installer';

    constructor(
        public readonly transactionId: string,
        public readonly id: number,
    ) {}
}
