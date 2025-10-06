import { JumpGroupType, RdpQualityMode, SecureAppType } from '../enums';

export class ModifyRemoteRdpCommand {
    public readonly commandType = 'modify-remote-rdp';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly id: number,
        public readonly name?: string,
        public readonly jumpointId?: number,
        public readonly hostname?: string,
        public readonly jumpGroupId?: number,
        public readonly jumpGroupType?: JumpGroupType,
        public readonly qualityMode?: RdpQualityMode,
        public readonly mustStartNewConsoleSession?: boolean,
        public readonly mustIgnoreUntrustedServerCert?: boolean,
        public readonly tag?: string,
        public readonly comments?: string,
        public readonly rdpUsername?: string,
        public readonly domain?: string,
        public readonly jumpPolicyId?: number | null,
        public readonly isSessionForensicsEnabled?: boolean,
        public readonly sessionPolicyId?: number | null,
        public readonly secureAppType?: SecureAppType,
        public readonly remoteAppName?: string,
        public readonly remoteAppParams?: string,
        public readonly remoteExePath?: string,
        public readonly remoteExeParams?: string,
        public readonly targetSystem?: string,
        public readonly credentialType?: string,
    ) {}
}
