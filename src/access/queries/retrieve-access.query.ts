export class RetrieveAccessQuery {
    public readonly queryType = 'retrieve-access';

    constructor(
        public readonly transactionId: string,
        public readonly pageSize: number,
        public readonly pageNumber: number,
        public readonly key?: string,
        public readonly name?: string,
    ) {}
}
