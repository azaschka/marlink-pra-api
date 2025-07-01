export class CreateSiteCommand {
    public readonly commandType = 'create-site';

    constructor(
        public readonly transactionId: string,
        public readonly key: string,
        public readonly name: string,
        public readonly customerKey: string,
        public readonly customerName: string,
        public readonly approverUsername: string,
        public readonly approverEmail: string,
    ) {}
}
