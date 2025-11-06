export class AddJumpointToGroupPolicyCommand {
    public readonly commandType = 'add-jumpoint-to-group-policy';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly id: number,
        public readonly jumpointId: number,
    ) {}
}
