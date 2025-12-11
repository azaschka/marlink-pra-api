import { SortOrderType } from '../../shared/enums';

export class RetrieveMonitoringRecordsQuery {
    public readonly queryType = 'retrieve-monitoring-records';

    constructor(
        public readonly transactionId: string,
        public readonly pageSize: number,
        public readonly pageNumber: number,
        public readonly creationDateFrom?: Date,
        public readonly creationDateTo?: Date,
        public readonly sortOrderType?: SortOrderType,
    ) {}
}
