import { BusinessUnit } from '../../beyondtrust-instance/enums';

export class RetrieveJumpointInstallerByCustomerAndSiteQuery {
    public readonly queryType = 'retrieve-jumpoint-installer-by-customer-and-site';

    constructor(
        public readonly transactionId: string,
        public readonly businessUnits: BusinessUnit[],
        public readonly customerKey: string | undefined,
        public readonly siteKey: string,
    ) {}
}
