import { CreateAccessCommandHandler } from './create-access.command-handler';
import { DeleteAccessCommandHandler } from './delete-access.command-handler';
import { ModifyAccessCommandHandler } from './modify-access.command-handler';

export const CommandHandlers = [CreateAccessCommandHandler, ModifyAccessCommandHandler, DeleteAccessCommandHandler];
