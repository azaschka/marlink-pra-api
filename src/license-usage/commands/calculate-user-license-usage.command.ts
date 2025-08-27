import { Customer } from '../../customer/models';
import { Site } from '../../site/models';

export class CalculateUserLicenseUsageCommand {
    public readonly commandType = 'calculate-user-license-usage';

    constructor(
        public readonly transactionId: string,
        public readonly customer: Customer,
        public readonly site?: Site,
    ) {}
}
