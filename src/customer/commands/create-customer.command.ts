import { BillingType } from '../enums';

export class CreateCustomerCommand {
    public readonly commandType = 'create-customer';

    constructor(
        public readonly transactionId: string,
        public readonly key: string,
        public readonly name: string,
        public readonly billingType: BillingType,
    ) {}
}
