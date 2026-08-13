export class ClearExpiredLogsCommand {
    public readonly commandType = 'clear-expired-logs';

    constructor(
        public readonly transactionId: string,
        public readonly retentionDays: number,
    ) {}
}
