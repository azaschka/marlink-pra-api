import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { JumpGroupType, RdpQualityMode, SecureAppType } from '../../enums';

export class ModifyRemoteRdpDtoInput {
    @ApiProperty({ required: false, type: String })
    @IsOptional()
    @IsString()
    public name?: string;

    @ApiProperty({ required: false, type: Number })
    @IsOptional()
    @IsInt()
    public jumpointId?: number;

    @ApiProperty({ required: false, type: String })
    @IsOptional()
    @IsString()
    public hostname?: string;

    @ApiProperty({ required: false, type: Number })
    @IsOptional()
    @IsInt()
    public jumpGroupId?: number;

    @ApiProperty({ required: false, enum: JumpGroupType })
    @IsOptional()
    @IsEnum(JumpGroupType)
    public jumpGroupType?: JumpGroupType;

    @ApiProperty({ required: false, enum: RdpQualityMode })
    @IsOptional()
    @IsEnum(RdpQualityMode)
    public qualityMode?: RdpQualityMode;

    @ApiProperty({ required: false, type: Boolean })
    @IsOptional()
    @IsBoolean()
    public mustStartNewConsoleSession?: boolean;

    // MARLINKPRA-55: kept for backward compatibility with existing integrations, but the
    // value is currently ignored — RDP Jump Items always have untrusted-certificate
    // warnings disabled. See ModifyRemoteRdpCommandHandler.
    @ApiProperty({
        required: false,
        type: Boolean,
        description:
            'Currently ignored. RDP Jump Items always have untrusted server certificate warnings ' +
            'disabled (MARLINKPRA-55), regardless of the value provided here.',
    })
    @IsOptional()
    @IsBoolean()
    public mustIgnoreUntrustedServerCert?: boolean;

    @ApiProperty({ required: false, type: String })
    @IsOptional()
    @IsString()
    public tag?: string;

    @ApiProperty({ required: false, type: String })
    @IsOptional()
    @IsString()
    public comments?: string;

    @ApiProperty({ required: false, type: String })
    @IsOptional()
    @IsString()
    public rdpUsername?: string;

    @ApiProperty({ required: false, type: String })
    @IsOptional()
    @IsString()
    public domain?: string;

    @ApiProperty({ required: false, type: Number, nullable: true })
    @IsOptional()
    @IsInt()
    public jumpPolicyId?: number | null;

    @ApiProperty({ required: false, type: Boolean })
    @IsOptional()
    @IsBoolean()
    public isSessionForensicsEnabled?: boolean;

    @ApiProperty({ required: false, type: Number, nullable: true })
    @IsOptional()
    @IsInt()
    public sessionPolicyId?: number | null;

    @ApiProperty({ required: false, enum: SecureAppType })
    @IsOptional()
    @IsEnum(SecureAppType)
    public secureAppType?: SecureAppType;

    @ApiProperty({ required: false, type: String })
    @IsOptional()
    @IsString()
    public remoteAppName?: string;

    @ApiProperty({ required: false, type: String })
    @IsOptional()
    @IsString()
    public remoteAppParams?: string;

    @ApiProperty({ required: false, type: String })
    @IsOptional()
    @IsString()
    public remoteExePath?: string;

    @ApiProperty({ required: false, type: String })
    @IsOptional()
    @IsString()
    public remoteExeParams?: string;

    @ApiProperty({ required: false, type: String })
    @IsOptional()
    @IsString()
    public targetSystem?: string;

    @ApiProperty({ required: false, type: String })
    @IsOptional()
    @IsString()
    public credentialType?: string;
}
