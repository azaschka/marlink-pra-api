export class RetrieveDiscrepancyScanStatusQuery {
    public readonly queryType = 'retrieve-discrepancy-scan-status';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly scanId: string,
    ) {}
}
