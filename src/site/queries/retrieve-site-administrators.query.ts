export class RetrieveSiteAdministratorsQuery {
    public readonly queryType = 'retrieve-site-administrators';

    constructor(
        public readonly transactionId: string,
        public readonly pageSize: number,
        public readonly pageNumber: number,
        public readonly userId?: number,
    ) {}
}
