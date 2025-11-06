import { Team } from '../../team/models';
import { User } from '../../user/models';
import { UserTeamRoleType } from '../enums';

export interface TeamUser {
    teamId: number;
    userId: number;
    roleType: UserTeamRoleType;
    lastSyncDate: Date;
    team?: Team;
    user?: User;
}
