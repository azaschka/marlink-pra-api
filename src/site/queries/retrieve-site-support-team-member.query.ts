export class RetrieveSiteSupportTeamMembersQuery {
    public readonly queryType = 'retrieve-site-support-team-members';

    constructor(
        public readonly transactionId: string,
        public readonly pageSize: number,
        public readonly pageNumber: number,
        public readonly siteId: number,
    ) {}
}
