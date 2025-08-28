export class CalculateCustomerLicenseUsageCommand {
    public readonly commandType = 'calculate-customer-license-usage';

    constructor(
        public readonly transactionId: string,
        public readonly id: number,
    ) {}
}
