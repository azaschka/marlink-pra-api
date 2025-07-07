import { CopyRemoteRdpCommandHandler } from './copy-remote-rdp.command-handler';
import { CreateRemoteRdpCommandHandler } from './create-remote-rdp.command-handler';
import { DeleteRemoteRdpCommandHandler } from './delete-remote-rdp.command-handler';
import { ModifyRemoteRdpCommandHandler } from './modify-remote-rdp.command-handler';

export const CommandHandlers = [
    CreateRemoteRdpCommandHandler,
    ModifyRemoteRdpCommandHandler,
    DeleteRemoteRdpCommandHandler,
    CopyRemoteRdpCommandHandler,
];
