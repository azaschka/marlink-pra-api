import { PartialSiteAuditorWithUserId } from './site-auditor.model';
import { PartialSiteManagerWithUserId } from './site-manager.model';
import { PartialSiteSupportTeamMemberWithUserId } from './site-support-team-member.model';

export interface SiteWorkflowResult {
    siteManagers: PartialSiteManagerWithUserId[];
    siteAuditors: PartialSiteAuditorWithUserId[];
    siteSupportTeamMembers: PartialSiteSupportTeamMemberWithUserId[];
}
