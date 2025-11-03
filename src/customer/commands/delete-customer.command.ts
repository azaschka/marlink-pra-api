export class DeleteCustomerCommand {
    public readonly commandType = 'delete-customer';

    constructor(
        public readonly transactionId: string,
        public readonly id: number,
    ) {}
}
