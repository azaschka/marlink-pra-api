export class RetrieveBeyondtrustInstanceBackupsQuery {
    public readonly queryType = 'retrieve-beyondtrust-instance-backups';

    constructor(
        public readonly transactionId: string,
        public readonly pageSize: number,
        public readonly pageNumber: number,
        public readonly beyondtrustInstanceId: number,
    ) {}
}
