export class RemoveJumpointFromGroupPolicyCommand {
    public readonly commandType = 'remove-jumpoint-from-group-policy';

    constructor(
        public readonly transactionId: string,
        public readonly id: number,
        public readonly jumpointId: number,
    ) {}
}
