import { UserTeamRoleType } from '../enums';

export interface TeamUser {
    teamId: number;
    userId: number;
    roleType: UserTeamRoleType;
}
