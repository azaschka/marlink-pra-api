export class DeleteAccessCommand {
    public readonly commandType = 'delete-access';

    constructor(
        public readonly transactionId: string,
        public readonly id: number,
    ) {}
}
