import { RetrieveJumpointInstallerQueryHandler } from './retrieve-jumpoint-installer.query-handler';
import { RetrieveJumpointNodesQueryHandler } from './retrieve-jumpoint-nodes.query-handler';
import { RetrieveJumpointsQueryHandler } from './retrieve-jumpoints.query-handler';

export const QueryHandlers = [
    RetrieveJumpointsQueryHandler,
    RetrieveJumpointNodesQueryHandler,
    RetrieveJumpointInstallerQueryHandler,
];
