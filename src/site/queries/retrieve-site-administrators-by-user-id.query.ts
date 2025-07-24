export class RetrieveSiteAdministratorsByUserIdQuery {
    public readonly queryType = 'retrieve-site-administrators-by-user-id';

    constructor(
        public readonly transactionId: string,
        public readonly pageSize: number,
        public readonly pageNumber: number,
        public readonly userId: number,
    ) {}
}
