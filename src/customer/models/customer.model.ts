import { BillingType, BusinessUnit } from '../enums';

export interface Customer {
    id: number;
    key: string;
    name: string;
    businessUnit: BusinessUnit;
    isDeactivated: boolean;
    billingType: BillingType;
    creationDate: Date;
    lastModificationDate?: Date;
}
