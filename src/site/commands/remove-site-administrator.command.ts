export class RemoveSiteAdministratorCommand {
    public readonly commandType = 'remove-site-administrator';

    constructor(
        public readonly transactionId: string,
        public readonly siteId: number,
        public readonly siteAdministratorId: number,
    ) {}
}
