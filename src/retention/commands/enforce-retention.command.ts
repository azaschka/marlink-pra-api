/** Deletes expired rows of pra_logs and pra_monitorings (hourly job, see RetentionService). */
export class EnforceRetentionCommand {
    public readonly commandType = 'enforce-retention';

    constructor(public readonly transactionId: string) {}
}
