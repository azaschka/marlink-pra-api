import { CustomerSiteInfo } from '../models';

export class RetrieveSocJumpItemsQuery {
    public readonly queryType = 'retrieve-soc-jump-items';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly pageSize: number,
        public readonly pageNumber: number,
        public readonly customerSiteInfo?: CustomerSiteInfo[],
    ) {}
}
