export class RetrieveJumpGroupByIdQuery {
    public readonly queryType = 'retrieve-jump-group-by-id';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly id: number,
    ) {}
}
