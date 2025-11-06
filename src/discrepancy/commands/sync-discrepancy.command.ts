import { DiscrepancySyncType } from '../enums';

export class SyncDiscrepancyCommand {
    public readonly commandType = 'sync-discrepancy';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly id: number,
        public readonly syncType: DiscrepancySyncType,
    ) {}
}
