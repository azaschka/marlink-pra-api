export class MarkGroupPolicyMemberAsSyncedCommand {
    public readonly commandType = 'mark-group-policy-member-as-synced';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly groupPolicyId: number,
        public readonly memberId: number,
    ) {}
}
