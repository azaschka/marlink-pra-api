import { SocCustomerSiteMappingStatus } from '../enums';

export class RetrieveSocJumpItemsQuery {
    public readonly queryType = 'retrieve-soc-jump-items';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly pageSize: number,
        public readonly pageNumber: number,
        public readonly customerKey?: string,
        public readonly siteKey?: string,
        public readonly mappingStatus?: SocCustomerSiteMappingStatus,
        /** `undefined` means platform-wide access, i.e. no customer restriction. */
        public readonly scopedCustomerKeys?: string[],
    ) {}
}
