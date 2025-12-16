import { BaseSiteUser } from './base-site-user.model';

export interface SiteAuditor extends BaseSiteUser {
    username: string;
    email: string;
    isAdminOperator: boolean;
}

export type PartialSiteAuditor = Omit<SiteAuditor, keyof BaseSiteUser> & Partial<BaseSiteUser>;
export type PartialSiteAuditorWithUserId = Omit<PartialSiteAuditor, 'userId'> & {
    userId: number;
};
