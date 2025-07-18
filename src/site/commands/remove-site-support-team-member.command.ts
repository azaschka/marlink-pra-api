export class RemoveSiteSupportTeamMemberCommand {
    public readonly commandType = 'remove-site-support-team-member';

    constructor(
        public readonly transactionId: string,
        public readonly siteId: number,
        public readonly siteSupportTeamMemberId: number,
    ) {}
}
