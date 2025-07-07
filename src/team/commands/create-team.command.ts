export class CreateTeamCommand {
    public readonly commandType = 'create-team';

    constructor(
        public readonly transactionId: string,
        public readonly name: string,
        public readonly codeName?: string,
        public readonly comments?: string | null,
    ) {}
}
