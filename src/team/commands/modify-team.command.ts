export class ModifyTeamCommand {
    public readonly commandType = 'modify-team';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly id: number,
        public readonly name?: string,
        public readonly codeName?: string,
        public readonly comments?: string | null,
    ) {}
}
