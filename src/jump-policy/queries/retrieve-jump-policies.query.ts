export class RetrieveJumpPoliciesQuery {
    public readonly queryType = 'retrieve-jump-policies';

    constructor(
        public readonly transactionId: string,
        public readonly pageSize: number,
        public readonly pageNumber: number,
        public readonly codeName?: string,
    ) {}
}
