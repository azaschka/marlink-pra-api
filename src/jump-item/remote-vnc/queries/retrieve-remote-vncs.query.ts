import { JumpGroupType } from '../enums';

export class RetrieveRemoteVncsQuery {
    public readonly queryType = 'retrieve-remote-vncs';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly pageSize: number,
        public readonly pageNumber: number,
        public readonly name?: string,
        public readonly hostname?: string,
        public readonly jumpGroupId?: number,
        public readonly jumpGroupType?: JumpGroupType,
        public readonly jumpointId?: number,
        public readonly tag?: string,
    ) {}
}
