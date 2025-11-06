export class RetrieveWebJumpByIdQuery {
    public readonly queryType = 'retrieve-web-jump-by-id';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly id: number,
    ) {}
}
