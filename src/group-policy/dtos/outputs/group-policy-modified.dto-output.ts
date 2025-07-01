import { ApiProperty } from '@nestjs/swagger';
import { AccessPermissionStatusType } from '../../enums';
import { GroupPolicy } from '../../models';

export class GroupPolicyModifiedDtoOutput implements GroupPolicy {
    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier assigned to this group policy by the system.',
    })
    public id!: number;

    @ApiProperty({
        required: true,
        type: String,
        description: 'The name of the group policy.',
    })
    public name!: string;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'Allowed to access endpoints.',
    })
    public hasEndpointsAccessPermission?: boolean;

    @ApiProperty({
        required: false,
        enum: AccessPermissionStatusType,
        description: `This field indicates if this policy defines user permissions or not. A value of 'defined' means the policy defines values for user permissions. A value of 'final' is the same as defined, except it will also prevent other policies of lower priority from overriding the permission value set by this Policy. The default value is "defined" if the request includes any user permission fields; otherwise the default is "not-defined".`,
    })
    public accessPermissionStatusType?: AccessPermissionStatusType;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'Allowed to share sessions with teams which they do not belong to.',
    })
    public hasShareOtherTeamPermission?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'Allowed to invite external Users.',
    })
    public hasInviteExternalUserPermission?: boolean;

    @ApiProperty({
        required: false,
        type: Number,
        description: `Remove User from the session after they've been inactive for a certain number of seconds. Allowed values are -1, 0, 300, 600, 900, 1800, 3600, 7200, 14400, 28800, 43200, and 86400. -1 means "Use site wide setting". 0 means "No timeout".`,
    })
    public userSessionIdleTimeoutInSeconds?: number;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'Allowed to enable extended availability mode.',
    })
    public hasEnableExtendedAvailabilityModePermission?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'Allowed to edit the external key.',
    })
    public hasEditExternalKeyPermission?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'Allowed to show screen to other Users.',
    })
    public hasCollaboratePermission?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'Allowed to give control when showing screen to other Users.',
    })
    public hasCollaborateControlPermission?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'Allowed to use Jump Clients.',
    })
    public hasJumpClientPermission?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'Allowed to use Local Jump (Windows only).',
    })
    public hasLocalJumpPermission?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'Allowed to use Remote Jump.',
    })
    public hasRemoteJumpPermission?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'Allowed to use Remote VNC.',
    })
    public hasRemoteVncPermission?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'Allowed to use Remote RDP.',
    })
    public hasRemoteRdpPermission?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'Allowed to use Shell Jump.',
    })
    public hasShellJumpPermission?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'Allowed to use Web Jump.',
    })
    public hasWebJumpPermission?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'Allowed to use Protocol Tunnel Jump.',
    })
    public hasProtocolTunnelPermission?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'Allowed to use static port and username for external tool sessions.',
    })
    public hasSdStaticPortForExternalToolsPermission?: boolean;

    @ApiProperty({
        required: false,
        type: Number,
        description: 'Default Jump Item Role.',
    })
    public defaultJumpItemRoleId?: number;

    @ApiProperty({
        required: false,
        type: Number,
        description: 'Personal Jump Item Role.',
    })
    public privateJumpItemRoleId?: number;

    @ApiProperty({
        required: false,
        type: Number,
        description: 'Teams Jump Item Role.',
    })
    public inferiorJumpItemRoleId?: number;

    @ApiProperty({
        required: false,
        type: Number,
        description: 'System Jump Item Role.',
    })
    public unassignedJumpItemRoleId?: number;

    @ApiProperty({
        required: true,
        type: Date,
        description: 'The date which the user was last synchronized with BeyondTrust Privileged Remote Access system.',
    })
    public lastSyncDate!: Date;
}
