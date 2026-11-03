export class RemoveUserFromGroupPolicyCommand {
    public readonly commandType = 'remove-user-from-group-policy';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly id: number,
        public readonly userId: number,
        /** Also find out whether BeyondTrust still reports the group policy for the user afterwards. */
        public readonly shouldVerifyEffectiveMembership: boolean = false,
    ) {}
}
