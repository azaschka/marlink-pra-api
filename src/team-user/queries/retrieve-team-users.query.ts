export class RetrieveTeamUsersQuery {
    public readonly queryType = 'retrieve-team-users';

    constructor(
        public readonly transactionId: string,
        public readonly pageSize: number,
        public readonly pageNumber: number,
        public readonly teamId: number,
    ) {}
}
