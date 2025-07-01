import { AccessPermissionStatusType } from '../enums';

export class ModifyGroupPolicyCommand {
    public readonly commandType = 'modify-group-policy';

    constructor(
        public readonly transactionId: string,
        public readonly id: number,
        public readonly name?: string,
        public readonly hasEndpointsAccessPermission?: boolean,
        public readonly accessPermissionStatusType?: AccessPermissionStatusType,
        public readonly hasShareOtherTeamPermission?: boolean,
        public readonly hasInviteExternalUserPermission?: boolean,
        public readonly userSessionIdleTimeoutInSeconds?: number,
        public readonly hasEnableExtendedAvailabilityModePermission?: boolean,
        public readonly hasEditExternalKeyPermission?: boolean,
        public readonly hasCollaboratePermission?: boolean,
        public readonly hasCollaborateControlPermission?: boolean,
        public readonly hasJumpClientPermission?: boolean,
        public readonly hasLocalJumpPermission?: boolean,
        public readonly hasRemoteJumpPermission?: boolean,
        public readonly hasRemoteVncPermission?: boolean,
        public readonly hasRemoteRdpPermission?: boolean,
        public readonly hasShellJumpPermission?: boolean,
        public readonly hasWebJumpPermission?: boolean,
        public readonly hasProtocolTunnelPermission?: boolean,
        public readonly hasSdStaticPortForExternalToolsPermission?: boolean,
        public readonly defaultJumpItemRoleId?: number,
        public readonly privateJumpItemRoleId?: number,
        public readonly inferiorJumpItemRoleId?: number,
        public readonly unassignedJumpItemRoleId?: number,
    ) {}
}
