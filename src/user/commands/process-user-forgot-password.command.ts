export class ProcessUserForgotPasswordCommand {
    public readonly commandType = 'process-user-forgot-password';

    constructor(
        public readonly transactionId: string,
        public readonly email: string,
    ) {}
}
