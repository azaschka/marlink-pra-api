export class RetrieveGroupPolicyJumpointsQuery {
    public readonly queryType = 'retrieve-group-policy-jumpoints';

    constructor(
        public readonly transactionId: string,
        public readonly pageSize: number,
        public readonly pageNumber: number,
        public readonly groupPolicyId: number,
    ) {}
}
