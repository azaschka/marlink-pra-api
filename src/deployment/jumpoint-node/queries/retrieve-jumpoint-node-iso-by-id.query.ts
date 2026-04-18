export class RetrieveJumpointNodeIsoByIdQuery {
    public readonly queryType = 'retrieve-jumpoint-node-iso-by-id';

    constructor(
        public readonly transactionId: string,
        public readonly id: number,
    ) {}
}
