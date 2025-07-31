export interface SiteApprover {
    id: number;
    siteId: number;
    email: string;
    creationDate: Date;
    lastModificationDate?: Date;
}

export type PartialSiteApprover = Omit<SiteApprover, 'id' | 'siteId' | 'creationDate'> & {
    id?: number;
    siteId?: number;
    creationDate?: Date;
};
