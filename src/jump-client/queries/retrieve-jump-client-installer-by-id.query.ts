export class RetrieveJumpClientInstallerByIdQuery {
    public readonly queryType = 'retrieve-jump-client-installer-by-id';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly id: number,
    ) {}
}
