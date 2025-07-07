export class RetrieveTeamsQuery {
    public readonly queryType = 'retrieve-teams';

    constructor(
        public readonly transactionId: string,
        public readonly pageSize: number,
        public readonly pageNumber: number,
        public readonly name?: string,
        public readonly codeName?: string,
    ) {}
}
