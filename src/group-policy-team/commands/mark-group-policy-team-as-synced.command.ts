export class MarkGroupPolicyTeamAsSyncedCommand {
    public readonly commandType = 'mark-group-policy-team-as-synced';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly groupPolicyId: number,
        public readonly teamId: number,
    ) {}
}
