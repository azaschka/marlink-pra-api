export class RetrieveTeamByIdQuery {
    public readonly queryType = 'retrieve-team-by-id';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly id: number,
    ) {}
}
