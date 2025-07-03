export class DeleteUserCommand {
    public readonly commandType = 'delete-user';

    constructor(
        public readonly transactionId: string,
        public readonly id: number,
    ) {}
}
