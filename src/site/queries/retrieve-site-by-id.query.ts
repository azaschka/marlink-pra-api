export class RetrieveSiteByIdQuery {
    public readonly queryType = 'retrieve-site-by-id';

    constructor(
        public readonly transactionId: string,
        public readonly siteId: number,
    ) {}
}
