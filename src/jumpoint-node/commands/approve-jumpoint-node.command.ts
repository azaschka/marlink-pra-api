export class ApproveJumpointNodeCommand {
    public readonly commandType = 'approve-jumpoint-node';

    constructor(
        public readonly transactionId: string,
        public readonly id: number,
    ) {}
}
