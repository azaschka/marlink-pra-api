import { GroupPolicyTeamRoleType } from '../enums';

export class AddTeamToGroupPolicyCommand {
    public readonly commandType = 'add-team-to-group-policy';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly id: number,
        public readonly teamId: number,
        public readonly roleType?: GroupPolicyTeamRoleType,
    ) {}
}
