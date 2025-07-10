export class RetrieveSitesQuery {
    public readonly queryType = 'retrieve-sites';

    constructor(
        public readonly transactionId: string,
        public readonly pageSize: number,
        public readonly pageNumber: number,
        public readonly key?: string,
        public readonly name?: string,
        public readonly customerKey?: string,
        public readonly namePattern?: string,
    ) {}
}
