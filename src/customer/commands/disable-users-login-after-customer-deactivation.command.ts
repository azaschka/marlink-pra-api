export class DisableUsersLoginAfterCustomerDeactivationCommand {
    public readonly commandType = 'disable-users-login-after-customer-deactivation';

    constructor(
        public readonly transactionId: string,
        public readonly customerId: number,
    ) {}
}
