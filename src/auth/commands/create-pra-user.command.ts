export class CreatePraUserCommand {
    public readonly commandType = 'create-pra-user';

    constructor(
        public readonly transactionId: string,
        public readonly username: string,
        public readonly password: string,
        public readonly email: string,
        public readonly role: string,
        public readonly displayName: string,
    ) {}
}
