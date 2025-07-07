import { GroupPolicyTeamRoleType } from '../enums';

export interface GroupPolicyTeam {
    groupPolicyId: number;
    teamId: number;
    roleType?: GroupPolicyTeamRoleType;
}
