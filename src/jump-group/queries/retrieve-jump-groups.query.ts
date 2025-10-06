export class RetrieveJumpGroupsQuery {
    public readonly queryType = 'retrieve-jump-groups';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly pageSize: number,
        public readonly pageNumber: number,
        public readonly name?: string,
        public readonly codeName?: string,
    ) {}
}
