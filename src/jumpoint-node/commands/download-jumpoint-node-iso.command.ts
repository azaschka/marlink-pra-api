export class DownloadJumpointNodeIsoCommand {
    public readonly commandType = 'download-jumpoint-node-iso';

    constructor(
        public readonly transactionId: string,
        public readonly id: number,
    ) {}
}
