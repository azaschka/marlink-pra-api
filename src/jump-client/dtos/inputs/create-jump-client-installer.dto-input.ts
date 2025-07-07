import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { JumpClientConnectionType, JumpClientGroupType } from '../../enums';

export class CreateJumpClientInstallerDtoInput {
    @ApiProperty({
        required: false,
        type: String,
        description:
            'The name for the Jump Clients deployed using this installer. If left blank, the Jump Client name will be set to the name of the computer on which the installer is deployed.',
    })
    @IsOptional()
    @IsString()
    public name?: string;

    @ApiProperty({
        required: true,
        type: Number,
        description: 'The shared Jump Group that will own the Jump Clients deployed using this installer.',
    })
    @IsNotEmpty()
    @IsInt()
    public jumpGroupId!: number;

    @ApiProperty({
        required: false,
        enum: JumpClientGroupType,
        description: 'The type of Jump Group that owns this Jump Clients.',
        default: JumpClientGroupType.Shared,
    })
    @IsEnum(JumpClientGroupType)
    @IsOptional()
    public jumpGroupType?: JumpClientGroupType;

    @ApiProperty({
        required: false,
        type: Number,
        description: 'The unique identifier of the Jump Policy used to manage access to the Jump Client.',
    })
    @IsOptional()
    @IsInt()
    public jumpPolicyId?: number;

    @ApiProperty({
        required: false,
        type: String,
        description: 'The tag for the Jump Clients deployed using this installer.',
    })
    @IsOptional()
    @IsString()
    public tag?: string;

    @ApiProperty({
        required: false,
        enum: JumpClientConnectionType,
        description: 'The type of Jump Client to deploy. Cloud deployments only allow active installers.',
        default: JumpClientConnectionType.Active,
    })
    @IsEnum(JumpClientConnectionType)
    @IsOptional()
    public connectionType?: JumpClientConnectionType;

    @ApiProperty({
        required: false,
        type: Number,
        nullable: true,
        description: 'The session policy used on the Jump Client system.',
    })
    @IsOptional()
    @IsInt()
    public sessionPolicyId?: number | null;

    @ApiProperty({
        required: false,
        type: String,
        description: 'The comments for the Jump Clients deployed using this installer.',
        default: '',
    })
    @IsOptional()
    @IsString()
    public comments?: string;

    @ApiProperty({
        required: false,
        type: Number,
        description:
            'The number of minutes that the installer will be valid after it is downloaded. When the installer expires it can no longer be used to deploy new jump clients.',
        default: 1440,
    })
    @IsOptional()
    @IsInt()
    public validDurationInMinutes?: number;

    @ApiProperty({
        required: false,
        type: Boolean,
        description: 'If true, the installer will attempt to elevate the Jump Client to make it run as a service',
        default: true,
    })
    @IsOptional()
    @IsBoolean()
    public shouldElevateInstall?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description:
            'If true, the installer will prompt for elevation credentials if necessary. This parameter is ignored if shouldElevateInstall is false.',
        default: true,
    })
    @IsOptional()
    @IsBoolean()
    public shouldElevatePrompt?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description:
            'If true, the jump group can be specified during installation, which will override the jump group id specified in this API call.',
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    public canOverrideJumpGroup?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description:
            'If true, the jump policy can be specified during installation, which will override the jump policy id specified in this API call.',
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    public canOverrideJumpPolicy?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description:
            'If true, the name can be specified during installation, which will override the name specified in this API call.',
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    public canOverrideName?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description:
            'If true, the tag can be specified during installation, which will override the tag specified in this API call.',
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    public canOverrideTag?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description:
            'If true, the comments can be specified during installation, which will override the comments specified in this API call.',
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    public canOverrideComments?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description:
            'If true, the session policy can be specified during installation, which will override the value specified in this API call.',
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    public canOverrideSessionPolicy?: boolean;

    @ApiProperty({
        required: false,
        type: String,
        nullable: true,
        description: 'The name of the Jumpoint. It must be online with Jump Zone Proxy enabled.',
    })
    @IsOptional()
    @IsString()
    public jumpointProxy?: string | null;
}
