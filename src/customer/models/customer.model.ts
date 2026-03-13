import { BusinessUnit } from '../../beyondtrust-instance/enums';
import { BeyondtrustInstance } from '../../beyondtrust-instance/models';

export interface Customer {
    id: number;
    key: string;
    name: string;
    businessUnit: BusinessUnit;
    isDeactivated: boolean;
    beyondtrustInstanceId: number;
    creationDate: Date;
    lastModificationDate?: Date;
    beyondtrustInstance: BeyondtrustInstance;
}
