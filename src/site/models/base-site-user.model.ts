/**
 * Base model for site administrators, managers, and support team members
 */
export interface BaseSiteUser {
    id: number;
    siteId: number;
    userId: number;
    creationDate: Date;
    lastModificationDate?: Date;
}
