export class RetrieveJumpClientByIdQuery {
    public readonly queryType = 'retrieve-jump-client-by-id';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly id: number,
    ) {}
}
