export class AddSiteAdministratorCommand {
    public readonly commandType = 'add-site-administrator';

    constructor(
        public readonly transactionId: string,
        public readonly siteId: number,
        public readonly username: string,
        public readonly email: string,
        public readonly isAdminOperator: boolean,
    ) {}
}
