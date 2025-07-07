export class RemoveJumpGroupFromGroupPolicyCommand {
    public readonly commandType = 'remove-jump-group-from-group-policy';

    constructor(
        public readonly transactionId: string,
        public readonly id: number,
        public readonly jumpGroupId: number,
    ) {}
}
