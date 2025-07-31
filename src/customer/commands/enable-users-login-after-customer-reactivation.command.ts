export class EnableUsersLoginAfterCustomerReactivationCommand {
    public readonly commandType = 'enable-users-login-after-customer-reactivation';

    constructor(
        public readonly transactionId: string,
        public readonly customerId: number,
    ) {}
}
