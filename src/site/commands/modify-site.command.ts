export class ModifySiteCommand {
    public readonly commandType = 'modify-site';

    constructor(
        public readonly transactionId: string,
        public readonly id: number,
        public readonly customerKey?: string,
        public readonly customerName?: string,
        public readonly approverUsername?: string,
        public readonly approverEmail?: string,
    ) {}
}
