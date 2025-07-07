export class RetrieveGroupPolicyTeamsQuery {
    public readonly queryType = 'retrieve-group-policy-teams';

    constructor(
        public readonly transactionId: string,
        public readonly pageSize: number,
        public readonly pageNumber: number,
        public readonly groupPolicyId: number,
    ) {}
}
