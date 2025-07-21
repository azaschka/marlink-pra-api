import { CreatePraUserCommandHandler } from './create-pra-user.command-handler';
import { DeletePraUserCommandHandler } from './delete-pra-user.command-handler';
import { ModifyPraUserCommandHandler } from './modify-pra-user.command-handler';

export const CommandHandlers = [CreatePraUserCommandHandler, DeletePraUserCommandHandler, ModifyPraUserCommandHandler];
