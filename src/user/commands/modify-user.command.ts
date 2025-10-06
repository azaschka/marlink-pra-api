export class ModifyUserCommand {
    public readonly commandType = 'modify-user';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly id: number,
        public readonly publicDisplayName?: string,
        public readonly username?: string,
        public readonly password?: string,
        public readonly passwordExpirationDate?: Date | null,
        public readonly email?: string,
        public readonly preferredEmailLanguage?: string,
        public readonly isTwoFactorAuthRequired?: boolean,
        public readonly isLoginAllowed?: boolean,
        public readonly failedLoginAttempts?: number,
        public readonly mustResetPasswordOnNextLogin?: boolean,
        public readonly regeneratePassword?: boolean,
    ) {}
}
