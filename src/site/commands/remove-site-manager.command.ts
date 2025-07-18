export class RemoveSiteManagerCommand {
    public readonly commandType = 'remove-site-manager';

    constructor(
        public readonly transactionId: string,
        public readonly siteId: number,
        public readonly siteManagerId: number,
    ) {}
}
