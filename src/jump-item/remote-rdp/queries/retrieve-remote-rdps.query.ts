import { JumpGroupType } from '../enums';

export class RetrieveRemoteRdpsQuery {
    public readonly queryType = 'retrieve-remote-rdps';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly pageSize: number,
        public readonly pageNumber: number,
        public readonly name?: string,
        public readonly hostname?: string,
        public readonly jumpGroupIds?: number[],
        public readonly jumpGroupType?: JumpGroupType,
        public readonly jumpointId?: number,
        public readonly endpointId?: number,
        public readonly tag?: string,
    ) {}
}
