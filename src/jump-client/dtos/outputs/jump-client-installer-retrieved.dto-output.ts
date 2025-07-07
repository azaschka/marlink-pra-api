import { ApiProperty } from '@nestjs/swagger';
import { JumpClientConnectionType, JumpClientGroupType } from '../../enums';
import { JumpClientInstaller, JumpClientInstallerKeyInfo } from '../../models';
import { JumpClientInstallerKeyInfoDtoOutput } from './jump-client-installer-key-info.dto-output';

export class JumpClientInstallerRetrievedDtoOutput implements JumpClientInstaller {
    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier assigned to this Jump Client Installer by the appliance.',
    })
    public id!: number;

    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier of the shared Jump Group or user that owns this Jump Client.',
    })
    public jumpGroupId!: number;

    @ApiProperty({
        required: false,
        enum: JumpClientGroupType,
        description: 'The type of Jump Group that owns this Jump Client.',
    })
    public jumpGroupType?: JumpClientGroupType;

    @ApiProperty({ required: false, type: String, description: "The Jump Client's user-friendly name." })
    public name?: string;

    @ApiProperty({ required: false, type: String, description: "The Jump Client's tag." })
    public tag?: string;

    @ApiProperty({ required: false, type: String, description: "The Jump Client's comments." })
    public comments?: string;

    @ApiProperty({
        required: false,
        type: Number,
        description: 'The unique identifier of the Jump Policy used to manage access to this Jump Item.',
    })
    public jumpPolicyId?: number;

    @ApiProperty({
        required: false,
        type: Number,
        nullable: true,
        description: 'The session policy used on the Jump Client system.',
    })
    public sessionPolicyId?: number | null;

    @ApiProperty({
        required: false,
        enum: JumpClientConnectionType,
        description:
            'The type of connection maintained between the appliance and the Jump Client. Cloud deployments only allow active Jump Clients.',
    })
    public connectionType?: JumpClientConnectionType;

    @ApiProperty({
        required: false,
        type: Date,
        description: 'The date/time at which the Jump Client installer will no longer be valid.',
    })
    public expirationDate?: Date;

    @ApiProperty({
        required: false,
        type: Number,
        description:
            'The maximum number of minutes the installed Jump Client can be offline before being uninstalled. If 0, the Jump Client will follow the global lost client settings.',
    })
    public maxOfflineDurationInMinutes?: number;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'If true, the installer will attempt to elevate the Jump Client to make it run as a service.',
    })
    public shouldElevateInstall?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description:
            'If true, the installer will prompt for elevation credentials if necessary. This parameter is ignored if shouldElevateInstall is false.',
    })
    public shouldElevatePrompt?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description:
            'If true, the jump group can be specified during installation, which will override the jump group id specified in this API call.',
    })
    public canOverrideJumpGroup?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description:
            'If true, the jump policy can be specified during installation, which will override the jump policy id specified in this API call.',
    })
    public canOverrideJumpPolicy?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description:
            'If true, the name can be specified during installation, which will override the name specified in this API call.',
    })
    public canOverrideName?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description:
            'If true, the tag can be specified during installation, which will override the tag specified in this API call.',
    })
    public canOverrideTag?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description:
            'If true, the comments can be specified during installation, which will override the comments specified in this API call.',
    })
    public canOverrideComments?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description:
            'If true, the session policy can be specified during installation, which will override the value specified in this API call.',
    })
    public canOverrideSessionPolicy?: boolean;

    @ApiProperty({
        required: false,
        type: String,
        description:
            'The unique installer identifier that can be used to download the installer for a specific platform.',
    })
    public installerId?: string;

    @ApiProperty({ required: false, type: [JumpClientInstallerKeyInfoDtoOutput] })
    public keyInfo?: JumpClientInstallerKeyInfo[];

    @ApiProperty({ required: false, type: String, nullable: true, description: 'The name of the Jumpoint proxy.' })
    public jumpointProxy?: string | null;

    @ApiProperty({
        required: true,
        type: Date,
        description: 'The date which the user was last synchronized with BeyondTrust Privileged Remote Access system.',
    })
    public lastSyncDate!: Date;
}
