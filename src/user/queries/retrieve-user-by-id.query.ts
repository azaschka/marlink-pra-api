export class RetrieveUserByIdQuery {
    public readonly queryType = 'retrieve-user-by-id';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly id: number,
    ) {}
}
