export class RetrieveUsersQuery {
    public readonly queryType = 'retrieve-users';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly pageSize: number,
        public readonly pageNumber: number,
        public readonly securityProviderId?: number,
        public readonly username?: string,
        public readonly email?: string,
    ) {}
}
