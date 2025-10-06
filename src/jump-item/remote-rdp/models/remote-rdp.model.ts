import { JumpGroup } from '../../../jump-group/models';
import { JumpPolicy } from '../../../jump-policy/models';
import { Jumpoint } from '../../../jumpoint/models';
import { JumpGroupType, RdpQualityMode, SecureAppType } from '../enums';

export interface RemoteRdp {
    id: number;
    name: string;
    jumpointId: number;
    hostname: string;
    jumpGroupId: number;
    jumpGroupType?: JumpGroupType;
    qualityMode?: RdpQualityMode;
    mustStartNewConsoleSession?: boolean;
    mustIgnoreUntrustedServerCert?: boolean;
    tag?: string;
    comments?: string;
    rdpUsername?: string;
    domain?: string;
    jumpPolicyId?: number | null;
    isSessionForensicsEnabled?: boolean;
    sessionPolicyId?: number | null;
    endpointId?: number | null;
    secureAppType?: SecureAppType;
    remoteAppName?: string;
    remoteAppParams?: string;
    remoteExePath?: string;
    remoteExeParams?: string;
    targetSystem?: string;
    credentialType?: string;
    lastSyncDate: Date;
    jumpoint?: Jumpoint;
    jumpGroup?: JumpGroup;
    jumpPolicy?: JumpPolicy | null;
}
