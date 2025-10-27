import { DiscrepancyEntityType } from '../enums';

export class ScanDiscrepancyCommand {
    public readonly commandType = 'scan-discrepancy';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly entityType: DiscrepancyEntityType,
    ) {}
}
