export class SendUserPasswordResetEmailCommand {
    public readonly commandType = 'send-user-password-reset-email';

    constructor(
        public readonly transactionId: string,
        public readonly sendTo: string,
        public readonly username: string,
        public readonly urlExpirationInMinutes: number,
        public readonly resetUrl: string,
    ) {}
}
