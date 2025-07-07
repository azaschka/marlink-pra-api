import { JumpGroupType } from '../enums';

export interface RemoteVnc {
    id: number;
    name: string;
    jumpointId: number;
    hostname: string;
    port?: number;
    jumpGroupId: number;
    jumpGroupType?: JumpGroupType;
    tag?: string;
    comments?: string;
    jumpPolicyId?: number | null;
    sessionPolicyId?: number | null;
    lastSyncDate: Date;
}
