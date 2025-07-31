export class ReactivateCustomerCommand {
    public readonly commandType = 'reactivate-customer';

    constructor(
        public readonly transactionId: string,
        public readonly id: number,
    ) {}
}
