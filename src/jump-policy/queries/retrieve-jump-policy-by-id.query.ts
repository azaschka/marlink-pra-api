export class RetrieveJumpPolicyByIdQuery {
    public readonly queryType = 'retrieve-jump-policy-by-id';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly id: number,
    ) {}
}
