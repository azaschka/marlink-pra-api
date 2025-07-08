export class ModifyPraUserCommand {
    public readonly commandType = 'modify-pra-user';

    constructor(
        public readonly transactionId: string,
        public readonly id: number,
        public readonly username?: string,
        public readonly password?: string,
        public readonly email?: string,
        public readonly role?: string,
        public readonly displayName?: string,
    ) {}
}
