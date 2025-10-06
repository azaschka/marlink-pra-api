export class DeleteJumpPolicyCommand {
    public readonly commandType = 'delete-jump-policy';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly id: number,
    ) {}
}
