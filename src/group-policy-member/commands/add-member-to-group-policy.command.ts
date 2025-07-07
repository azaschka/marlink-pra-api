export class AddMemberToGroupPolicyCommand {
    public readonly commandType = 'add-member-to-group-policy';

    constructor(
        public readonly transactionId: string,
        public readonly id: number,
        public readonly userId: number,
        public readonly securityProviderId: number,
        public readonly distinguishedName?: string,
        public readonly groupName?: string,
    ) {}
}
