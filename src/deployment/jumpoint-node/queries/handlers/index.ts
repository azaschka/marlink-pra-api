import { RetrieveJumpointNodeByIdQueryHandler } from './retrieve-jumpoint-node-by-id.query-handler';
import { RetrieveJumpointNodeIsoByIdQueryHandler } from './retrieve-jumpoint-node-iso-by-id.query-handler';
import { RetrieveJumpointNodesQueryHandler } from './retrieve-jumpoint-nodes.query-handler';

export const QueryHandlers = [
    RetrieveJumpointNodesQueryHandler,
    RetrieveJumpointNodeByIdQueryHandler,
    RetrieveJumpointNodeIsoByIdQueryHandler,
];
