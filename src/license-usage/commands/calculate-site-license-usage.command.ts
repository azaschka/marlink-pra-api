export class CalculateSiteLicenseUsageCommand {
    public readonly commandType = 'calculate-site-license-usage';

    constructor(
        public readonly transactionId: string,
        public readonly id: number,
    ) {}
}
