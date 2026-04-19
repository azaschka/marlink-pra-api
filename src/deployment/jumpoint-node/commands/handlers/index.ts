import { ApproveJumpointNodeCommandHandler } from './approve-jumpoint-node.command-handler';
import { CreateJumpointNodeServiceCommandHandler } from './create-jumpoint-node-service.command-handler';
import { CreateJumpointNodeCommandHandler } from './create-jumpoint-node.command-handler';
import { DeleteJumpointNodeCommandHandler } from './delete-jumpoint-node.command-handler';
import { DownloadJumpointNodeIsoCommandHandler } from './download-jumpoint-node-iso.command-handler';

export const CommandHandlers = [
    ApproveJumpointNodeCommandHandler,
    CreateJumpointNodeServiceCommandHandler,
    CreateJumpointNodeCommandHandler,
    DeleteJumpointNodeCommandHandler,
    DownloadJumpointNodeIsoCommandHandler,
];
