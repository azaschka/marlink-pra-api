export class SendUserActivationEmailCommand {
    public readonly commandType = 'send-user-activation-email';

    constructor(
        public readonly transactionId: string,
        public readonly sendTo: string,
        public readonly displayName: string,
        public readonly username: string,
        public readonly password: string,
        public readonly cname: string | null,
    ) {}
}
