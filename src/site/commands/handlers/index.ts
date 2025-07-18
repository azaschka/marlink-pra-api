import { AddSiteAdministratorCommandHandler } from './add-site-administrator.command-handler';
import { AddSiteManagerCommandHandler } from './add-site-manager.command-handler';
import { AddSiteSupportTeamMemberCommandHandler } from './add-site-support-team-member.command-handler';
import { CreateSiteCommandHandler } from './create-site.command-handler';
import { DeleteSiteCommandHandler } from './delete-site.command-handler';
import { RemoveSiteAdministratorCommandHandler } from './remove-site-administrator.command-handler';
import { RemoveSiteManagerCommandHandler } from './remove-site-manager.command-handler';
import { RemoveSiteSupportTeamMemberCommandHandler } from './remove-site-support-team-member.command-handler';

export const CommandHandlers = [
    CreateSiteCommandHandler,
    DeleteSiteCommandHandler,
    AddSiteAdministratorCommandHandler,
    AddSiteManagerCommandHandler,
    AddSiteSupportTeamMemberCommandHandler,
    RemoveSiteManagerCommandHandler,
    RemoveSiteAdministratorCommandHandler,
    RemoveSiteSupportTeamMemberCommandHandler,
];
