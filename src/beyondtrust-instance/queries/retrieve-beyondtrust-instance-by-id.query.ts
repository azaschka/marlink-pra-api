export class RetrieveBeyondtrustInstanceByIdQuery {
    public readonly queryType = 'retrieve-beyondtrust-instance-by-id';

    constructor(
        public readonly transactionId: string,
        public readonly id: number,
    ) {}
}
