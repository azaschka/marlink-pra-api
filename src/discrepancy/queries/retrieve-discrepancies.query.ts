import { DiscrepancyEntityType } from '../enums';

export class RetrieveDiscrepanciesQuery {
    public readonly queryType = 'retrieve-discrepancies';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly pageSize: number,
        public readonly pageNumber: number,
        public readonly entityType?: DiscrepancyEntityType,
        public readonly entityId?: number,
    ) {}
}
