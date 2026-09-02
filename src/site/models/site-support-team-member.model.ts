import { UserSourceType } from '../enums';
import { SiteSupportTeamAccessLevel } from '../enums/site-support-team-access-level.enum';
import { SiteSupportTeamTrustLevel } from '../enums/site-support-team-trust-level.enum';
import { BaseSiteUser } from './base-site-user.model';

export interface SiteSupportTeamMember extends BaseSiteUser {
    firstname: string;
    lastname: string;
    email: string;
    supportTeamName: string;
    supportTeamAccessLevel: SiteSupportTeamAccessLevel;
    supportTeamTrustLevel: SiteSupportTeamTrustLevel;
}

export type PartialSiteSupportTeamMember = Omit<SiteSupportTeamMember, keyof BaseSiteUser> &
    Partial<BaseSiteUser> & {
        sourceType: UserSourceType;
    };
export type PartialSiteSupportTeamMemberWithUserId = Omit<PartialSiteSupportTeamMember, 'userId' | 'sourceType'> & {
    userId: number;
    sourceType: UserSourceType;
};
