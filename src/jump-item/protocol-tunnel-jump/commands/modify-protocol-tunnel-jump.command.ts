import { JumpGroupType, TunnelType } from '../enums';

export class ModifyProtocolTunnelJumpCommand {
    public readonly commandType = 'modify-protocol-tunnel-jump';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly id: number,
        public readonly name?: string,
        public readonly jumpointId?: number,
        public readonly hostname?: string,
        public readonly jumpGroupId?: number,
        public readonly jumpGroupType?: JumpGroupType,
        public readonly tag?: string,
        public readonly comments?: string,
        public readonly jumpPolicyId?: number | null,
        public readonly sessionPolicyId?: number | null,
        public readonly tunnelListenAddress?: string,
        public readonly tunnelDefinitions?: string,
        public readonly tunnelType?: TunnelType,
        public readonly username?: string,
        public readonly database?: string,
        public readonly url?: string,
        public readonly caCertificates?: string,
    ) {}
}
