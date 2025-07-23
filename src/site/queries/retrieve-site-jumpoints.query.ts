export class RetrieveSiteJumpointsQuery {
    public readonly queryType = 'retrieve-site-jumpoints';

    constructor(
        public readonly transactionId: string,
        public readonly pageSize: number,
        public readonly pageNumber: number,
        public readonly siteId: number,
    ) {}
}
