export class CreateUserCommand {
    public readonly commandType = 'create-user';

    constructor(
        public readonly transactionId: string,
        public readonly publicDisplayName: string,
        public readonly username: string,
        public readonly password?: string,
        public readonly passwordExpirationDate?: Date | null,
        public readonly email?: string,
        public readonly preferredEmailLanguage?: string,
        public readonly isTwoFactorAuthRequired?: boolean,
        public readonly isLoginAllowed?: boolean,
        public readonly failedLoginAttempts?: number,
        public readonly mustResetPasswordOnNextLogin?: boolean,
    ) {}
}
