import { PartialSiteAdministratorWithUserId } from './site-administrator.model';
import { PartialSiteManagerWithUserId } from './site-manager.model';
import { PartialSiteSupportTeamMemberWithUserId } from './site-support-team-member.model';

export interface SiteWorkflowResult {
    siteManagers: PartialSiteManagerWithUserId[];
    siteAdministrators: PartialSiteAdministratorWithUserId[];
    siteSupportTeamMembers: PartialSiteSupportTeamMemberWithUserId[];
}
