import { BillingType, BusinessUnit } from '../enums';

export interface BeyondtrustInstance {
    id: number;
    name: string;
    authClientId: string;
    authClientSecret: string;
    oauth2TokenUrl: string;
    apiBaseUrl: string;
    billingType: BillingType;
    businessUnit: BusinessUnit;
    creationDate: Date;
    lastModificationDate?: Date;
}
