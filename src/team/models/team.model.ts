import { GroupPolicyTeam } from '../../group-policy-team/models';
import { TeamUser } from '../../team-user/models';

export interface Team {
    id: number;
    name: string;
    codeName?: string;
    comments?: string | null;
    lastSyncDate: Date;
    teamUsers?: TeamUser[];
    groupPolicyTeams?: GroupPolicyTeam[];
}
