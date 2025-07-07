export class DeletePraUserCommand {
    public readonly commandType = 'delete-pra-user';

    constructor(
        public readonly transactionId: string,
        public readonly id: number,
    ) {}
}
