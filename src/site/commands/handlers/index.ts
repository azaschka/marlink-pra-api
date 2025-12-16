import { AddSiteAuditorCommandHandler } from './add-site-auditor.command-handler';
import { AddSiteManagerCommandHandler } from './add-site-manager.command-handler';
import { AddSiteSupportTeamMemberCommandHandler } from './add-site-support-team-member.command-handler';
import { CreateSiteCommandHandler } from './create-site.command-handler';
import { DeleteSiteCommandHandler } from './delete-site.command-handler';
import { RemoveSiteAuditorCommandHandler } from './remove-site-auditor.command-handler';
import { RemoveSiteManagerCommandHandler } from './remove-site-manager.command-handler';
import { RemoveSiteSupportTeamMemberCommandHandler } from './remove-site-support-team-member.command-handler';

export const CommandHandlers = [
    CreateSiteCommandHandler,
    DeleteSiteCommandHandler,
    AddSiteAuditorCommandHandler,
    AddSiteManagerCommandHandler,
    AddSiteSupportTeamMemberCommandHandler,
    RemoveSiteManagerCommandHandler,
    RemoveSiteAuditorCommandHandler,
    RemoveSiteSupportTeamMemberCommandHandler,
];
