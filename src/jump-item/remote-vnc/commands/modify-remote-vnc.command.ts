import { JumpGroupType } from '../enums';

export class ModifyRemoteVncCommand {
    public readonly commandType = 'modify-remote-vnc';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly id: number,
        public readonly name?: string,
        public readonly jumpointId?: number,
        public readonly hostname?: string,
        public readonly port?: number,
        public readonly jumpGroupId?: number,
        public readonly jumpGroupType?: JumpGroupType,
        public readonly tag?: string,
        public readonly comments?: string,
        public readonly jumpPolicyId?: number | null,
        public readonly sessionPolicyId?: number | null,
    ) {}
}
