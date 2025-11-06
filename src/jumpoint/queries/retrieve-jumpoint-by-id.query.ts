export class RetrieveJumpointByIdQuery {
    public readonly queryType = 'retrieve-jumpoint-by-id';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly id: number,
    ) {}
}
