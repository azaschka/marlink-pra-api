export class CountMonitoringRecordsQuery {
    public readonly queryType = 'count-monitoring-records';

    constructor(
        public readonly transactionId: string,
        public readonly creationDateFrom?: Date,
        public readonly creationDateTo?: Date,
    ) {}
}
