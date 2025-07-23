import { RetrieveSiteAdministratorsQueryHandler } from './retrieve-site-administrators.query-handler';
import { RetrieveSiteJumpointsQueryHandler } from './retrieve-site-jumpoints.query-handler';
import { RetrieveSiteManagersQueryHandler } from './retrieve-site-managers.query-handler';
import { RetrieveSiteSupportTeamMembersQueryHandler } from './retrieve-site-support-team-member.query-handler';
import { RetrieveSitesQueryHandler } from './retrieve-sites.query-handler';

export const QueryHandlers = [
    RetrieveSitesQueryHandler,
    RetrieveSiteManagersQueryHandler,
    RetrieveSiteAdministratorsQueryHandler,
    RetrieveSiteSupportTeamMembersQueryHandler,
    RetrieveSiteJumpointsQueryHandler,
];
