export class DeactivateCustomerCommand {
    public readonly commandType = 'deactivate-customer';

    constructor(
        public readonly transactionId: string,
        public readonly id: number,
    ) {}
}
