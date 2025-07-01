export class DeleteGroupPolicyCommand {
    public readonly commandType = 'delete-group-policy';

    constructor(
        public readonly transactionId: string,
        public readonly id: number,
    ) {}
}
