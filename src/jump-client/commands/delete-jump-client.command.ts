export class DeleteJumpClientCommand {
    public readonly commandType = 'delete-jump-client';

    constructor(
        public readonly transactionId: string,
        public readonly id: number,
    ) {}
}
