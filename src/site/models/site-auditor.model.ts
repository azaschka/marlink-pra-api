import { UserSourceType } from '../../user/enums';
import { BaseSiteUser } from './base-site-user.model';

export interface SiteAuditor extends BaseSiteUser {
    username: string;
    email: string;
    isAdminOperator: boolean;
}

export type PartialSiteAuditor = Omit<SiteAuditor, keyof BaseSiteUser> &
    Partial<BaseSiteUser> & {
        sourceType: UserSourceType;
    };
export type PartialSiteAuditorWithUserId = Omit<PartialSiteAuditor, 'userId' | 'sourceType'> & {
    userId: number;
    sourceType: UserSourceType;
};
