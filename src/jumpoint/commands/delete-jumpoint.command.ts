export class DeleteJumpointCommand {
    public readonly commandType = 'delete-jumpoint';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly id: number,
    ) {}
}
