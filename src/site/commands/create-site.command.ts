import { PartialSiteAuditor, PartialSiteManager, PartialSiteSupportTeamMember } from '../models';

export class CreateSiteCommand {
    public readonly commandType = 'create-site';

    constructor(
        public readonly transactionId: string,
        public readonly key: string,
        public readonly name: string,
        public readonly customerKey: string,
        public readonly siteManagers: PartialSiteManager[],
        /**
         * Omitted (undefined) means "leave the existing site auditors unchanged"; an empty list removes them all.
         * The same applies to support team members and approver emails (EXT-08).
         */
        public readonly siteAuditors: PartialSiteAuditor[] | undefined,
        public readonly siteSupportTeamMembers: PartialSiteSupportTeamMember[] | undefined,
        public readonly siteApproverEmails: string[] | undefined,
    ) {}
}
