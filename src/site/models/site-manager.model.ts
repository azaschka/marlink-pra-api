import { BaseSiteUser } from './base-site-user.model';

export interface SiteManager extends BaseSiteUser {
    username: string;
    email: string;
}

export type PartialSiteManager = Omit<SiteManager, keyof BaseSiteUser> & Partial<BaseSiteUser>;
export type PartialSiteManagerWithUserId = Omit<PartialSiteManager, 'userId'> & {
    userId: number;
};
