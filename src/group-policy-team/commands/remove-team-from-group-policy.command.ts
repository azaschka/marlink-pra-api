export class RemoveTeamFromGroupPolicyCommand {
    public readonly commandType = 'remove-team-from-group-policy';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly id: number,
        public readonly teamId: number,
    ) {}
}
