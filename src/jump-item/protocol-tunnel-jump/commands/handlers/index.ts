import { CopyProtocolTunnelJumpCommandHandler } from './copy-protocol-tunnel-jump.command-handler';
import { CreateProtocolTunnelJumpCommandHandler } from './create-protocol-tunnel-jump.command-handler';
import { DeleteProtocolTunnelJumpCommandHandler } from './delete-protocol-tunnel-jump.command-handler';
import { ModifyProtocolTunnelJumpCommandHandler } from './modify-protocol-tunnel-jump.command-handler';

export const CommandHandlers = [
    CreateProtocolTunnelJumpCommandHandler,
    ModifyProtocolTunnelJumpCommandHandler,
    DeleteProtocolTunnelJumpCommandHandler,
    CopyProtocolTunnelJumpCommandHandler,
];
