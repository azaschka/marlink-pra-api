/** Starts a manual scan of all entity types of the tenant in the background (or joins the one running). */
export class ScanAllDiscrepanciesCommand {
    public readonly commandType = 'scan-all-discrepancies';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
    ) {}
}
