export class RetrieveSessionPoliciesQuery {
    public readonly queryType = 'retrieve-session-policies';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly pageSize: number,
        public readonly pageNumber: number,
        public readonly displayName?: string,
        public readonly codeName?: string,
        public readonly codeNamePatterns?: string[],
    ) {}
}
