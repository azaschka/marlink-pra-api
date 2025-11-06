import { GroupPolicy } from '../../group-policy/models';
import { Team } from '../../team/models';
import { GroupPolicyTeamRoleType } from '../enums';

export interface GroupPolicyTeam {
    groupPolicyId: number;
    teamId: number;
    roleType?: GroupPolicyTeamRoleType;
    lastSyncDate: Date;
    groupPolicy?: GroupPolicy;
    team?: Team;
}
