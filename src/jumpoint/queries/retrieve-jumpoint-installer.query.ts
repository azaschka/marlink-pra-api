export class RetrieveJumpointInstallerQuery {
    public readonly queryType = 'retrieve-jumpoint-installer';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly jumpointId: number,
    ) {}
}
