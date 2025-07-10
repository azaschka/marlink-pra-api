import { SiteApprover } from './site-approver.model';

export interface Site {
    id: number;
    key: string;
    name: string;
    customerKey: string;
    approvers: SiteApprover[];
    creationDate: Date;
    lastModificationDate?: Date;
}
