import { CreateJumpGroupCommandHandler } from './create-jump-group.command-handler';
import { DeleteJumpGroupCommandHandler } from './delete-jump-group.command-handler';
import { ModifyJumpGroupCommandHandler } from './modify-jump-group.command-handler';

export const CommandHandlers = [
    CreateJumpGroupCommandHandler,
    ModifyJumpGroupCommandHandler,
    DeleteJumpGroupCommandHandler,
];
