export class RetrieveBeyondtrustInstanceBackupByIdQuery {
    public readonly queryType = 'retrieve-beyondtrust-instance-backup-by-id';

    constructor(
        public readonly transactionId: string,
        public readonly beyondtrustInstanceId: number,
        public readonly id: number,
    ) {}
}
