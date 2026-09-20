import { SiteSupportTeamAccessLevel, SiteSupportTeamTrustLevel } from '../enums';
import { UserSourceType } from '../../user/enums';

export class AddSiteSupportTeamMemberCommand {
    public readonly commandType = 'add-site-support-team-member';

    constructor(
        public readonly transactionId: string,
        public readonly siteId: number,
        public readonly firstname: string,
        public readonly lastname: string,
        public readonly email: string,
        public readonly supportTeamName: string,
        public readonly supportTeamAccessLevel: SiteSupportTeamAccessLevel,
        public readonly supportTeamTrustLevel: SiteSupportTeamTrustLevel,
        public readonly sourceType: UserSourceType,
    ) {}
}
