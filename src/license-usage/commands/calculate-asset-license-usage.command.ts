import { Customer } from '../../customer/models';
import { Site } from '../../site/models';

export class CalculateAssetLicenseUsageCommand {
    public readonly commandType = 'calculate-asset-license-usage';

    constructor(
        public readonly transactionId: string,
        public readonly customer: Customer,
        public readonly site?: Site,
    ) {}
}
