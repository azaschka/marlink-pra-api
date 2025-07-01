import { CreateCustomerCommandHandler } from './create-customer.command-handler';
import { DeactivateCustomerCommandHandler } from './deactivate-customer.command-handler';
import { ModifyCustomerCommandHandler } from './modify-customer.command-handler';

export const CommandHandlers = [
    CreateCustomerCommandHandler,
    ModifyCustomerCommandHandler,
    DeactivateCustomerCommandHandler,
];
