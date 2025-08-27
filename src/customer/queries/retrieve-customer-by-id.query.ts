export class RetrieveCustomerByIdQuery {
    public readonly queryType = 'retrieve-customer-by-id';

    constructor(
        public readonly transactionId: string,
        public readonly customerId: number,
    ) {}
}
