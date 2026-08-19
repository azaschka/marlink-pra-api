import { BusinessUnit } from '../../beyondtrust-instance/enums';

export class RetrieveCustomersQuery {
    public readonly queryType = 'retrieve-customers';

    constructor(
        public readonly transactionId: string,
        public readonly pageSize: number,
        public readonly pageNumber: number,
        public readonly key?: string,
        public readonly name?: string,
        public readonly namePattern?: string,
        public readonly businessUnits?: BusinessUnit[],
        public readonly beyondtrustInstanceId?: number,
    ) {}
}
