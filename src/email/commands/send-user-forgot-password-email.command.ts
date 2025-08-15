export class SendUserForgotPasswordEmailCommand {
    public readonly commandType = 'send-user-forgot-password-email';

    constructor(
        public readonly transactionId: string,
        public readonly sendTo: string,
        public readonly username: string,
        public readonly password: string,
    ) {}
}
