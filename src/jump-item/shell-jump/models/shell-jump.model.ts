import { JumpGroup } from '../../../jump-group/models';
import { JumpPolicy } from '../../../jump-policy/models';
import { Jumpoint } from '../../../jumpoint/models';
import { JumpGroupType, ShellJumpProtocolType, ShellJumpTerminalType } from '../enums';

export interface ShellJump {
    id: number;
    name: string;
    jumpointId: number;
    hostname: string;
    protocolType: ShellJumpProtocolType;
    port?: number;
    jumpGroupId: number;
    jumpGroupType?: JumpGroupType;
    terminalType?: ShellJumpTerminalType;
    keepAliveIdleSessionInSeconds?: number;
    tag?: string;
    comments?: string;
    jumpPolicyId?: number | null;
    username?: string;
    sessionPolicyId?: number | null;
    lastSyncDate: Date;
    jumpoint?: Jumpoint;
    jumpGroup?: JumpGroup;
    jumpPolicy?: JumpPolicy | null;
}
