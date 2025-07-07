export class DeleteBeyondtrustInstanceCommand {
    public readonly commandType = 'delete-beyondtrust-instance';

    constructor(
        public readonly transactionId: string,
        public readonly id: number,
    ) {}
}
