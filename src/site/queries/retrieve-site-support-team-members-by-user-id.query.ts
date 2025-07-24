export class RetrieveSiteSupportTeamMembersByUserIdQuery {
    public readonly queryType = 'retrieve-site-support-team-members-by-user-id';

    constructor(
        public readonly transactionId: string,
        public readonly pageSize: number,
        public readonly pageNumber: number,
        public readonly userId: number,
    ) {}
}
