import { BusinessUnit } from '../../beyondtrust-instance/enums';

export class CreateCustomerCommand {
    public readonly commandType = 'create-customer';

    constructor(
        public readonly transactionId: string,
        public readonly key: string,
        public readonly name: string,
        public readonly businessUnit: BusinessUnit,
        public readonly beyondtrustInstanceId: number,
    ) {}
}
