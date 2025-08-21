import { CreateUserCommandHandler } from './create-user.command-handler';
import { DeleteUserCommandHandler } from './delete-user.command-handler';
import { ModifyUserCommandHandler } from './modify-user.command-handler';

export const CommandHandlers = [CreateUserCommandHandler, ModifyUserCommandHandler, DeleteUserCommandHandler];
