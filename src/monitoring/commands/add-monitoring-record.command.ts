export class AddMonitoringRecordCommand {
    public readonly commandType = 'add-monitoring-record';

    constructor(
        public readonly transactionId: string,
        public readonly endpointPath: string,
    ) {}
}
