import { BaseSiteUser } from './base-site-user.model';

export interface SiteAdministrator extends BaseSiteUser {
    username: string;
    email: string;
    isAdminOperator: boolean;
}

export type PartialSiteAdministrator = Omit<SiteAdministrator, keyof BaseSiteUser> & Partial<BaseSiteUser>;
export type PartialSiteAdministratorWithUserId = Omit<PartialSiteAdministrator, 'userId'> & {
    userId: number;
};
