import { JumpointNodeBusinessUnit, JumpointNodeHypervisorType } from '../enums';

export class RetrieveJumpointNodesQuery {
    public readonly queryType = 'retrieve-jumpoint-nodes';

    constructor(
        public readonly transactionId: string,
        public readonly pageSize: number,
        public readonly pageNumber: number,
        public readonly certname?: string,
        public readonly businessUnits?: JumpointNodeBusinessUnit[],
        public readonly siteKey?: string,
        public readonly customerName?: string | null,
        public readonly puppetServerDomain?: string,
        public readonly hypervisorId?: string,
        public readonly hypervisorType?: JumpointNodeHypervisorType,
        public readonly vmId?: number,
    ) {}
}
