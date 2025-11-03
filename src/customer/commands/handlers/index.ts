import { CreateCustomerCommandHandler } from './create-customer.command-handler';
import { DeactivateCustomerCommandHandler } from './deactivate-customer.command-handler';
import { DeleteCustomerCommandHandler } from './delete-customer.command-handler';
import { DisableUsersLoginAfterCustomerDeactivationCommandHandler } from './disable-users-login-after-customer-deactivation.command-handler';
import { EnableUsersLoginAfterCustomerReactivationCommandHandler } from './enable-users-login-after-customer-reactivation.command-handler';
import { ModifyCustomerCommandHandler } from './modify-customer.command-handler';
import { ReactivateCustomerCommandHandler } from './reactivate-customer.command-handler';

export const CommandHandlers = [
    CreateCustomerCommandHandler,
    ModifyCustomerCommandHandler,
    DeactivateCustomerCommandHandler,
    ReactivateCustomerCommandHandler,
    DisableUsersLoginAfterCustomerDeactivationCommandHandler,
    EnableUsersLoginAfterCustomerReactivationCommandHandler,
    DeleteCustomerCommandHandler,
];
