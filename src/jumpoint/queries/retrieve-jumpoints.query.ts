export class RetrieveJumpointsQuery {
    public readonly queryType = 'retrieve-jumpoints';

    constructor(
        public readonly transactionId: string,
        public readonly pageSize: number,
        public readonly pageNumber: number,
        public readonly name?: string,
        public readonly publicIp?: string,
        public readonly privateIp?: string,
        public readonly hostname?: string,
        public readonly codeName?: string,
    ) {}
}
