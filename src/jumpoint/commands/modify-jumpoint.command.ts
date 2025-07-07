import { JzpClientAddressRestrictionsType } from '../enums';
import { JumpointIpRange } from '../models';

export class ModifyJumpointCommand {
    public readonly commandType = 'modify-jumpoint';

    constructor(
        public readonly transactionId: string,
        public readonly id: number,
        public readonly name?: string,
        public readonly codeName?: string,
        public readonly comments?: string,
        public readonly isEnabled?: boolean,
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
