export class RemoveUserFromTeamCommand {
    public readonly commandType = 'remove-user-from-team';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly id: number,
        public readonly userId: number,
    ) {}
}
