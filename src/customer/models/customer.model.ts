import { BillingType } from '../enums';

export interface Customer {
    id: number;
    key: string;
    name: string;
    isDeactivated: boolean;
    billingType: BillingType;
    adminGroupPolicyId: number;
    creationDate: Date;
    lastModificationDate?: Date;
}
