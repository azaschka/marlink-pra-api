import { BusinessUnit } from '../../beyondtrust-instance/enums';

export interface Customer {
    id: number;
    key: string;
    name: string;
    businessUnit: BusinessUnit;
    isDeactivated: boolean;
    beyondtrustInstanceId: number;
    creationDate: Date;
    lastModificationDate?: Date;
}
