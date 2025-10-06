import { JumpClient } from '../../jump-client/models';
import { ProtocolTunnelJump } from '../../jump-item/protocol-tunnel-jump/models';
import { RemoteRdp } from '../../jump-item/remote-rdp/models';
import { RemoteVnc } from '../../jump-item/remote-vnc/models';
import { ShellJump } from '../../jump-item/shell-jump/models';
import { WebJump } from '../../jump-item/web-jump/models';
import {
    ApprovalApproverScopeType,
    ApprovalScopeType,
    SimultaneousJumpsRdpType,
    SimultaneousJumpsType,
} from '../enums';

export interface JumpPolicy {
    id: number;
    displayName: string;
    codeName?: string;
    description?: string;
    hasScheduledAccessRestriction?: boolean;
    simultaneousJumpsType?: SimultaneousJumpsType;
    doesSimultaneousJumpBehaviorApplyToCopies?: boolean;
    simultaneousJumpsRdpType?: SimultaneousJumpsRdpType;
    shouldForceRemoveUsersWhenScheduleDisallows?: boolean;
    isTicketIdRequired?: boolean;
    isTwoFactorChallengeRequired?: boolean;
    isSessionStartNotificationEnabled?: boolean;
    isSessionEndNotificationEnabled?: boolean;
    notificationEmailAddresses?: string[];
    notificationDisplayName?: string;
    notificationEmailLanguage?: string;
    isApprovalRequired?: boolean;
    approvalMaxDurationInMinutes?: number;
    approvalScopeType?: ApprovalScopeType;
    approvalEmailAddresses?: string[];
    approvalUserIds?: string[];
    approvalTeamIds?: string[];
    approvalDisplayName?: string;
    approvalEmailLanguage?: string;
    approvalApproverScopeType?: ApprovalApproverScopeType;
    isRecordingsDisabled?: boolean;
    lastSyncDate: Date;
    protocolTunnelJumps?: ProtocolTunnelJump[];
    remoteRdps?: RemoteRdp[];
    remoteVncs?: RemoteVnc[];
    shellJumps?: ShellJump[];
    webJumps?: WebJump[];
    jumpClients?: JumpClient[];
}
