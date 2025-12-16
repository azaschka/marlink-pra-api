import { SiteAuditor } from './site-auditor.model';
import { SiteApprover } from './site-approver.model';
import { SiteManager } from './site-manager.model';
import { SiteSupportTeamMember } from './site-support-team-member.model';

export interface Site {
    id: number;
    key: string;
    name: string;
    customerKey: string;
    siteManagers: SiteManager[];
    siteAuditors: SiteAuditor[];
    siteSupportTeamMembers: SiteSupportTeamMember[];
    siteApprovers: SiteApprover[];
    creationDate: Date;
    lastModificationDate?: Date;
}
