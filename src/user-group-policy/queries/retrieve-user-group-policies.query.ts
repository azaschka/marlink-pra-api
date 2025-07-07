export class RetrieveUserGroupPoliciesQuery {
    public readonly queryType = 'retrieve-user-group-policies';

    constructor(
        public readonly transactionId: string,
        public readonly pageSize: number,
        public readonly pageNumber: number,
        public readonly userId: number,
    ) {}
}
