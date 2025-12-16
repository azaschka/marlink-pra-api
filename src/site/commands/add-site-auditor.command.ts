export class AddSiteAuditorCommand {
    public readonly commandType = 'add-site-auditor';

    constructor(
        public readonly transactionId: string,
        public readonly siteId: number,
        public readonly username: string,
        public readonly email: string,
        public readonly isAdminOperator: boolean,
    ) {}
}
