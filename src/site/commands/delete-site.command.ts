export class DeleteSiteCommand {
    public readonly commandType = 'delete-site';

    constructor(
        public readonly transactionId: string,
        public readonly id: number,
    ) {}
}
