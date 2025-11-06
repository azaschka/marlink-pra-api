export class AddJumpGroupToGroupPolicyCommand {
    public readonly commandType = 'add-jump-group-to-group-policy';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly id: number,
        public readonly jumpGroupId: number,
        public readonly jumpItemRoleId?: number,
        public readonly jumpPolicyId?: number,
    ) {}
}
