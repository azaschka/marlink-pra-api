import { CreatePraUserCommandHandler } from './create-pra-user.command-handler';
import { DeletePraUserCommandHandler } from './delete-pra-user.command-handler';
import { ModifyPraUserCommandHandler } from './modify-pra-user.command-handler';
import { PraUserForgotPasswordCommandHandler } from './pra-user-forgot-password.command-handler';

export const CommandHandlers = [
    CreatePraUserCommandHandler,
    DeletePraUserCommandHandler,
    ModifyPraUserCommandHandler,
    PraUserForgotPasswordCommandHandler,
];
