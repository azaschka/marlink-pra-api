import { GroupPolicyJumpGroup } from '../../group-policy-jump-group/models';
import { GroupPolicyJumpoint } from '../../group-policy-jumpoint/models';
import { GroupPolicyMember } from '../../group-policy-member/models';
import { GroupPolicyTeam } from '../../group-policy-team/models';
import { UserGroupPolicy } from '../../user-group-policy/models';
import { AccessPermissionStatusType } from '../enums';

export interface GroupPolicy {
    id: number;
    name: string;
    hasEndpointsAccessPermission?: boolean;
    accessPermissionStatusType?: AccessPermissionStatusType;
    hasShareOtherTeamPermission?: boolean;
    hasInviteExternalUserPermission?: boolean;
    userSessionIdleTimeoutInSeconds?: number;
    hasEnableExtendedAvailabilityModePermission?: boolean;
    hasEditExternalKeyPermission?: boolean;
    hasCollaboratePermission?: boolean;
    hasCollaborateControlPermission?: boolean;
    hasJumpClientPermission?: boolean;
    hasLocalJumpPermission?: boolean;
    hasRemoteJumpPermission?: boolean;
    hasRemoteVncPermission?: boolean;
    hasRemoteRdpPermission?: boolean;
    hasShellJumpPermission?: boolean;
    hasWebJumpPermission?: boolean;
    hasProtocolTunnelPermission?: boolean;
    hasSdStaticPortForExternalToolsPermission?: boolean;
    defaultJumpItemRoleId?: number;
    privateJumpItemRoleId?: number;
    inferiorJumpItemRoleId?: number;
    unassignedJumpItemRoleId?: number;
    lastSyncDate: Date;
    userGroupPolicies?: UserGroupPolicy[];
    groupPolicyJumpoints?: GroupPolicyJumpoint[];
    groupPolicyJumpGroups?: GroupPolicyJumpGroup[];
    groupPolicyMembers?: GroupPolicyMember[];
    groupPolicyTeams?: GroupPolicyTeam[];
}
