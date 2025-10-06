import { BusinessUnit } from '../../customer/enums';

export class RetrieveJumpointInstallerByCustomerAndSiteQuery {
    public readonly queryType = 'retrieve-jumpoint-installer-by-customer-and-site';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly businessUnit: BusinessUnit,
        public readonly customerKey: string,
        public readonly siteKey: string,
    ) {}
}
