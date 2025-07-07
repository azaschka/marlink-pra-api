import { CopyShellJumpCommandHandler } from './copy-shell-jump.command-handler';
import { CreateShellJumpCommandHandler } from './create-shell-jump.command-handler';
import { DeleteShellJumpCommandHandler } from './delete-shell-jump.command-handler';
import { ModifyShellJumpCommandHandler } from './modify-shell-jump.command-handler';

export const CommandHandlers = [
    CreateShellJumpCommandHandler,
    ModifyShellJumpCommandHandler,
    DeleteShellJumpCommandHandler,
    CopyShellJumpCommandHandler,
];
