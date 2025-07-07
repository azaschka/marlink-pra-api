import { JumpClientConnectionType, JumpClientGroupType } from '../enums';

export class RetrieveJumpClientsQuery {
    public readonly queryType = 'retrieve-jump-clients';

    constructor(
        public readonly transactionId: string,
        public readonly pageSize: number,
        public readonly pageNumber: number,
        public readonly name?: string,
        public readonly hostname?: string,
        public readonly fqdn?: string,
        public readonly tag?: string,
        public readonly jumpGroupId?: number,
        public readonly jumpGroupType?: JumpClientGroupType,
        public readonly consoleUser?: string,
        public readonly publicIp?: string,
        public readonly privateIp?: string,
        public readonly connectionType?: JumpClientConnectionType,
    ) {}
}
