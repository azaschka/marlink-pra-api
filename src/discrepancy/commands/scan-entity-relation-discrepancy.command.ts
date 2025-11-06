import { DiscrepancyEntityType } from '../enums';

export class ScanEntityRelationDiscrepancyCommand {
    public readonly commandType = 'scan-entity-relation-discrepancy';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly entityType: DiscrepancyEntityType,
        public readonly identicalDataIds: number[],
        public readonly onlyInExternalIds: number[],
        public readonly onlyInInternalIds: number[],
        public readonly differentDataIds: number[],
    ) {}
}
