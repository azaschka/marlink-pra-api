export class SendUserNewPasswordEmailCommand {
    public readonly commandType = 'send-user-new-password-email';

    constructor(
        public readonly transactionId: string,
        public readonly sendTo: string,
        public readonly displayName: string,
        public readonly username: string,
        public readonly password: string,
    ) {}
}
