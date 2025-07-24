import { RetrieveJumpClientInstallerPlatformQueryHandler } from './retrieve-jump-client-installer-platform.query-handler';
import { RetrieveJumpClientInstallersQueryHandler } from './retrieve-jump-client-installers.query-handler';
import { RetrieveJumpClientsQueryHandler } from './retrieve-jump-clients.query-handler';

export const QueryHandlers = [
    RetrieveJumpClientsQueryHandler,
    RetrieveJumpClientInstallersQueryHandler,
    RetrieveJumpClientInstallerPlatformQueryHandler,
];
