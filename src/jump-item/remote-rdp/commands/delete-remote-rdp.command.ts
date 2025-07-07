export class DeleteRemoteRdpCommand {
    public readonly commandType = 'delete-remote-rdp';

    constructor(
        public readonly transactionId: string,
        public readonly id: number,
    ) {}
}
