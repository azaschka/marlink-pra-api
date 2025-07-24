import { RetrieveSiteAdministratorsByUserIdQueryHandler } from './retrieve-site-administrators-by-user-id.query-handler';
import { RetrieveSiteAdministratorsQueryHandler } from './retrieve-site-administrators.query-handler';
import { RetrieveSiteJumpointsQueryHandler } from './retrieve-site-jumpoints.query-handler';
import { RetrieveSiteManagersByUserIdQueryHandler } from './retrieve-site-managers-by-user-id.query-handler';
import { RetrieveSiteManagersQueryHandler } from './retrieve-site-managers.query-handler';
import { RetrieveSiteSupportTeamMembersQueryHandler } from './retrieve-site-support-team-member.query-handler';
import { RetrieveSiteSupportTeamMembersByUserIdQueryHandler } from './retrieve-site-support-team-members-by-user-id.query-handler';
import { RetrieveSitesQueryHandler } from './retrieve-sites.query-handler';

export const QueryHandlers = [
    RetrieveSitesQueryHandler,
    RetrieveSiteManagersByUserIdQueryHandler,
    RetrieveSiteAdministratorsByUserIdQueryHandler,
    RetrieveSiteSupportTeamMembersByUserIdQueryHandler,
    RetrieveSiteJumpointsQueryHandler,
    RetrieveSiteAdministratorsQueryHandler,
    RetrieveSiteManagersQueryHandler,
    RetrieveSiteSupportTeamMembersQueryHandler,
];
