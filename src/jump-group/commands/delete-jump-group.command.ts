export class DeleteJumpGroupCommand {
    public readonly commandType = 'delete-jump-group';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly id: number,
    ) {}
}
