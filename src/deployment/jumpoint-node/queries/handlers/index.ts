import { RetrieveJumpointNodeByIdQueryHandler } from './retrieve-jumpoint-node-by-id.query-handler';
import { RetrieveJumpointNodeIsoByIdQueryHandler } from './retrieve-jumpoint-node-iso-by-id.query-handler';
import { DeploymentRetrieveJumpointNodesQueryHandler } from './deployment-retrieve-jumpoint-nodes.query-handler';

export const QueryHandlers = [
    DeploymentRetrieveJumpointNodesQueryHandler,
    RetrieveJumpointNodeByIdQueryHandler,
    RetrieveJumpointNodeIsoByIdQueryHandler,
];
