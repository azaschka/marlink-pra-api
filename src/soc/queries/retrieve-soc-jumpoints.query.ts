import { CustomerSiteInfo } from '../models';

export class RetrieveSocJumpointsQuery {
    public readonly queryType = 'retrieve-soc-jumpoints';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly pageSize: number,
        public readonly pageNumber: number,
        public readonly customerSiteInfo?: CustomerSiteInfo[],
    ) {}
}
