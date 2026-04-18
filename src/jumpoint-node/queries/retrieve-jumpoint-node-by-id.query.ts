export class RetrieveJumpointNodeByIdQuery {
    public readonly queryType = 'retrieve-jumpoint-node-by-id';

    constructor(
        public readonly transactionId: string,
        public readonly id: number,
    ) {}
}
