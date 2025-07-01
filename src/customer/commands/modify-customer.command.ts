import { BillingType } from '../enums';

export class ModifyCustomerCommand {
    public readonly commandType = 'modify-customer';

    constructor(
        public readonly transactionId: string,
        public readonly id: number,
        public readonly billingType?: BillingType,
    ) {}
}
