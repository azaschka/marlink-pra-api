export class DeleteJumpointNodeCommand {
    public readonly commandType = 'delete-jumpoint-node';

    constructor(
        public readonly transactionId: string,
        public readonly id: number,
    ) {}
}
