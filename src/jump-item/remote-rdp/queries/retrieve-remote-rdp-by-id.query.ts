export class RetrieveRemoteRdpByIdQuery {
    public readonly queryType = 'retrieve-remote-rdp-by-id';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly id: number,
    ) {}
}
