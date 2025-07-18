export class RetrieveSiteManagersQuery {
    public readonly queryType = 'retrieve-site-managers';

    constructor(
        public readonly transactionId: string,
        public readonly pageSize: number,
        public readonly pageNumber: number,
        public readonly userId?: number,
    ) {}
}
