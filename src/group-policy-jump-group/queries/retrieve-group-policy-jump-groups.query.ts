export class RetrieveGroupPolicyJumpGroupsQuery {
    public readonly queryType = 'retrieve-group-policy-jump-groups';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly pageSize: number,
        public readonly pageNumber: number,
        public readonly groupPolicyId: number,
    ) {}
}
