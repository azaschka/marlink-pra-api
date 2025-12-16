export class RetrieveSiteAuditorsQuery {
    public readonly queryType = 'retrieve-site-auditors';

    constructor(
        public readonly transactionId: string,
        public readonly pageSize: number,
        public readonly pageNumber: number,
        public readonly siteId: number,
    ) {}
}
