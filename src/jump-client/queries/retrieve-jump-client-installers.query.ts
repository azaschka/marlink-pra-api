import { JumpClientConnectionType, JumpClientGroupType } from '../enums';

export class RetrieveJumpClientInstallersQuery {
    public readonly queryType = 'retrieve-jump-client-installers';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly pageSize: number,
        public readonly pageNumber: number,
        public readonly name?: string,
        public readonly hostname?: string,
        public readonly fqdn?: string,
        public readonly tag?: string,
        public readonly jumpGroupIds?: number[],
        public readonly jumpGroupType?: JumpClientGroupType,
        public readonly connectionType?: JumpClientConnectionType,
        public readonly installerId?: string,
    ) {}
}
