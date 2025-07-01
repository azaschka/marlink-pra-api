import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { AccessPermissionStatusType } from '../../enums';

export class CreateGroupPolicyDtoInput {
    @ApiProperty({
        required: true,
        type: String,
        description: 'The name of the group policy.',
    })
    @IsNotEmpty()
    @IsString()
    public name!: string;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'Allowed to access endpoints.',
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    public hasEndpointsAccessPermission?: boolean;

    @ApiProperty({
        required: false,
        enum: AccessPermissionStatusType,
        description: `This field indicates if this policy defines user permissions or not. A value of 'defined' means the policy defines values for user permissions. A value of 'final' is the same as defined, except it will also prevent other policies of lower priority from overriding the permission value set by this Policy. The default value is "defined" if the request includes any user permission fields; otherwise the default is "not-defined".`,
        default: AccessPermissionStatusType.NotDefined,
    })
    @IsOptional()
    @IsEnum(AccessPermissionStatusType)
    public accessPermissionStatusType?: AccessPermissionStatusType;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'Allowed to share sessions with teams which they do not belong to.',
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    public hasShareOtherTeamPermission?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'Allowed to invite external Users.',
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    public hasInviteExternalUserPermission?: boolean;

    @ApiProperty({
        required: false,
        type: Number,
        description: `Remove User from the session after they've been inactive for a certain number of seconds. Allowed values are -1, 0, 300, 600, 900, 1800, 3600, 7200, 14400, 28800, 43200, and 86400. -1 means "Use site wide setting". 0 means "No timeout".`,
        default: -1,
    })
    @IsOptional()
    @IsNumber()
    public userSessionIdleTimeoutInSeconds?: number;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'Allowed to enable extended availability mode.',
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    public hasEnableExtendedAvailabilityModePermission?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'Allowed to edit the external key.',
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    public hasEditExternalKeyPermission?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'Allowed to show screen to other Users.',
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    public hasCollaboratePermission?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'Allowed to give control when showing screen to other Users.',
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    public hasCollaborateControlPermission?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'Allowed to use Jump Clients.',
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    public hasJumpClientPermission?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'Allowed to use Local Jump (Windows only).',
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    public hasLocalJumpPermission?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'Allowed to use Remote Jump.',
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    public hasRemoteJumpPermission?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'Allowed to use Remote VNC.',
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    public hasRemoteVncPermission?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'Allowed to use Remote RDP.',
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    public hasRemoteRdpPermission?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'Allowed to use Shell Jump.',
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    public hasShellJumpPermission?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'Allowed to use Web Jump.',
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    public hasWebJumpPermission?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'Allowed to use Protocol Tunnel Jump.',
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    public hasProtocolTunnelPermission?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'Allowed to use static port and username for external tool sessions.',
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    public hasSdStaticPortForExternalToolsPermission?: boolean;

    @ApiProperty({
        required: false,
        type: Number,
        description: 'Default Jump Item Role.',
        default: 1,
    })
    @IsOptional()
    @IsNumber()
    public defaultJumpItemRoleId?: number;

    @ApiProperty({
        required: false,
        type: Number,
        description: 'Personal Jump Item Role.',
        default: 1,
    })
    @IsOptional()
    @IsNumber()
    public privateJumpItemRoleId?: number;

    @ApiProperty({
        required: false,
        type: Number,
        description: 'Teams Jump Item Role.',
        default: 1,
    })
    @IsOptional()
    @IsNumber()
    public inferiorJumpItemRoleId?: number;

    @ApiProperty({
        required: false,
        type: Number,
        description: 'System Jump Item Role.',
        default: 1,
    })
    @IsOptional()
    @IsNumber()
    public unassignedJumpItemRoleId?: number;
}
