export class SendPraUserActivationEmailCommand {
    public readonly commandType = 'send-pra-user-activation-email';

    constructor(
        public readonly transactionId: string,
        public readonly sendTo: string,
        public readonly displayName: string,
        public readonly username: string,
        public readonly password: string,
        public readonly role: string,
    ) {}
}
