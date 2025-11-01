export class RetrieveRemoteVncByIdQuery {
    public readonly queryType = 'retrieve-remote-vnc-by-id';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly id: number,
    ) {}
}
