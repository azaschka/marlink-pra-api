import { CreateJumpPolicyCommandHandler } from './create-jump-policy.command-handler';
import { DeleteJumpPolicyCommandHandler } from './delete-jump-policy.command-handler';
import { ModifyJumpPolicyCommandHandler } from './modify-jump-policy.command-handler';

export const CommandHandlers = [
    CreateJumpPolicyCommandHandler,
    ModifyJumpPolicyCommandHandler,
    DeleteJumpPolicyCommandHandler,
];
