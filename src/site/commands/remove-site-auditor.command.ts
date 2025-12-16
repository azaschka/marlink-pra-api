export class RemoveSiteAuditorCommand {
    public readonly commandType = 'remove-site-auditor';

    constructor(
        public readonly transactionId: string,
        public readonly siteId: number,
        public readonly siteAuditorId: number,
    ) {}
}
