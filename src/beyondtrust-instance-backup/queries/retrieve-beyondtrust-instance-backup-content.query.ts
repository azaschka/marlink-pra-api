export class RetrieveBeyondtrustInstanceBackupContentQuery {
    public readonly queryType = 'retrieve-beyondtrust-instance-backup-content';

    constructor(
        public readonly transactionId: string,
        public readonly beyondtrustInstanceId: number,
        public readonly id: number,
    ) {}
}
