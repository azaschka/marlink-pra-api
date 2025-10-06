export class DeleteTeamCommand {
    public readonly commandType = 'delete-team';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly id: number,
    ) {}
}
