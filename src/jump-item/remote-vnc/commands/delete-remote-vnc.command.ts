export class DeleteRemoteVncCommand {
    public readonly commandType = 'delete-remote-vnc';

    constructor(
        public readonly transactionId: string,
        public readonly id: number,
    ) {}
}
