export class RetrieveGroupPolicyByIdQuery {
    public readonly queryType = 'retrieve-group-policy-by-id';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly id: number,
    ) {}
}
