import { CreateBeyondtrustInstanceCommandHandler } from './create-beyondtrust-instance.command-handler';
import { DeleteBeyondtrustInstanceCommandHandler } from './delete-beyondtrust-instance.command-handler';
import { ModifyBeyondtrustInstanceCommandHandler } from './modify-beyondtrust-instance.command-handler';

export const CommandHandlers = [
    CreateBeyondtrustInstanceCommandHandler,
    ModifyBeyondtrustInstanceCommandHandler,
    DeleteBeyondtrustInstanceCommandHandler,
];
