import { UserSourceType } from '../../user/enums';
import { BaseSiteUser } from './base-site-user.model';

export interface SiteManager extends BaseSiteUser {
    username: string;
    email: string;
}

export type PartialSiteManager = Omit<SiteManager, keyof BaseSiteUser> &
    Partial<BaseSiteUser> & {
        sourceType: UserSourceType;
    };
export type PartialSiteManagerWithUserId = Omit<PartialSiteManager, 'userId' | 'sourceType'> & {
    userId: number;
    sourceType: UserSourceType;
};
