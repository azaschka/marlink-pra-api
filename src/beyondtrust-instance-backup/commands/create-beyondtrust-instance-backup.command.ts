export class CreateBeyondtrustInstanceBackupCommand {
    public readonly commandType = 'create-beyondtrust-instance-backup';

    constructor(
        public readonly transactionId: string,
        public readonly beyondtrustInstanceId: number,
        public readonly password?: string,
    ) {}
}
