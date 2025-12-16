export class RetrieveSiteAuditorsByUserIdQuery {
    public readonly queryType = 'retrieve-site-auditors-by-user-id';

    constructor(
        public readonly transactionId: string,
        public readonly pageSize: number,
        public readonly pageNumber: number,
        public readonly userId: number,
    ) {}
}
