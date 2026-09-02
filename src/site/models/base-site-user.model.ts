import { UserSourceType } from '../enums';

/**
 * Base model for site administrators, managers, and support team members
 */
export interface BaseSiteUser {
    id: number;
    siteId: number;
    userId: number;
    sourceType: UserSourceType;
    creationDate: Date;
    lastModificationDate?: Date;
}
