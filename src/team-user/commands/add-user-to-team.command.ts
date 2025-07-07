import { UserTeamRoleType } from '../enums';

export class AddUserToTeamCommand {
    public readonly commandType = 'add-user-to-team';

    constructor(
        public readonly transactionId: string,
        public readonly id: number,
        public readonly userId: number,
        public readonly roleType?: UserTeamRoleType,
    ) {}
}
