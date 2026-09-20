import { ErrorReport } from '../error-reports';
import { PartialSiteAuditorWithUserId } from './site-auditor.model';
import { PartialSiteManagerWithUserId } from './site-manager.model';
import { PartialSiteSupportTeamMemberWithUserId } from './site-support-team-member.model';

/**
 * Emails of ingestion entries that could not be processed in this run, grouped by role.
 *
 * R3.2-A003, 3.1(4) and 3.1(5): a repeated ingestion run has to apply the difference between the source data
 * and the target system. An entry that failed to resolve carries no information about that difference, so it
 * must not be mistaken for an entry that was removed from the source data.
 */
export interface UnresolvedSiteUserEmails {
    siteManagers: string[];
    siteAuditors: string[];
    siteSupportTeamMembers: string[];
}

export interface SiteWorkflowResult {
    siteManagers: PartialSiteManagerWithUserId[];
    siteAuditors: PartialSiteAuditorWithUserId[];
    siteSupportTeamMembers: PartialSiteSupportTeamMemberWithUserId[];
    unresolvedEmails: UnresolvedSiteUserEmails;
    errorReport: ErrorReport;
}
