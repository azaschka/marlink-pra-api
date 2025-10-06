import { BillingType } from '../enums';

export class CreateBeyondtrustInstanceCommand {
    public readonly commandType = 'create-beyondtrust-instance';

    constructor(
        public readonly transactionId: string,
        public readonly name: string,
        public readonly authClientId: string,
        public readonly authClientSecret: string,
        public readonly oauth2TokenUrl: string,
        public readonly apiBaseUrl: string,
        public readonly billingType: BillingType,
    ) {}
}
