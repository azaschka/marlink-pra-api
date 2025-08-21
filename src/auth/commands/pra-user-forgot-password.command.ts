export class PraUserForgotPasswordCommand {
    public readonly commandType = 'pra-user-forgot-password';

    constructor(
        public readonly transactionId: string,
        public readonly email: string,
    ) {}
}
