import { CreateSiteCommandHandler } from './create-site.command-handler';
import { DeleteSiteCommandHandler } from './delete-site.command-handler';
import { ModifySiteCommandHandler } from './modify-site.command-handler';

export const CommandHandlers = [CreateSiteCommandHandler, ModifySiteCommandHandler, DeleteSiteCommandHandler];
