import { BusinessUnit } from '../enums';

export class RetrieveBeyondtrustInstancesQuery {
    public readonly queryType = 'retrieve-beyondtrust-instances';

    constructor(
        public readonly transactionId: string,
        public readonly pageSize: number,
        public readonly pageNumber: number,
        public readonly name?: string,
        public readonly oauth2TokenUrl?: string,
        public readonly apiBaseUrl?: string,
        public readonly businessUnits?: BusinessUnit[],
    ) {}
}
