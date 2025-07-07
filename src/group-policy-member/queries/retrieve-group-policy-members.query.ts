export class RetrieveGroupPolicyMembersQuery {
    public readonly queryType = 'retrieve-group-policy-members';

    constructor(
        public readonly transactionId: string,
        public readonly pageSize: number,
        public readonly pageNumber: number,
        public readonly groupPolicyId: number,
    ) {}
}
