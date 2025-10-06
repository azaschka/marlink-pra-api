import { JumpointPlatformType, JzpClientAddressRestrictionsType } from '../enums';
import { JumpointIpRange } from '../models';

export class CreateJumpointCommand {
    public readonly commandType = 'create-jumpoint';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly name: string,
        public readonly platformType: JumpointPlatformType,
        public readonly codeName?: string,
        public readonly comments?: string,
        public readonly isEnabled?: boolean,
        public readonly isClustered?: boolean,
        public readonly isShellJumpEnabled?: boolean,
        public readonly externalJumpItemNetworkId?: string,
        public readonly isProtocolTunnelEnabled?: boolean,
        public readonly rdpServiceAccountId?: number | null,
        public readonly managedIpRanges?: JumpointIpRange[],
        public readonly isJzpEnabled?: boolean,
        public readonly jzpProxyHostname?: string,
        public readonly jzpProxyPort?: number,
        public readonly isJzpHttpGetAllowed?: boolean,
        public readonly jzpClientAddressRestrictionsType?: JzpClientAddressRestrictionsType,
        public readonly jzpRestrictedIps?: string[],
    ) {}
}
