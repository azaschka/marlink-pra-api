export class DeleteMonitoringRecordsCommand {
    public readonly commandType = 'delete-monitoring-records';

    constructor(
        public readonly transactionId: string,
        public readonly creationDateFrom?: Date,
        public readonly creationDateTo?: Date,
    ) {}
}
