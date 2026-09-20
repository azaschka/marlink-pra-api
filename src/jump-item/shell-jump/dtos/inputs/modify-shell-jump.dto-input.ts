import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { AssetTag } from '../../../../shared/decorators';
import { JumpGroupType, ShellJumpProtocolType, ShellJumpTerminalType } from '../../enums';

export class ModifyShellJumpDtoInput {
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

    @ApiProperty({ required: false, enum: ShellJumpProtocolType })
    @IsOptional()
    @IsEnum(ShellJumpProtocolType)
    public protocolType?: ShellJumpProtocolType;

    @ApiProperty({ required: false, type: Number })
    @IsOptional()
    @IsInt()
    public port?: number;

    @ApiProperty({ required: false, type: Number })
    @IsOptional()
    @IsInt()
    public jumpGroupId?: number;

    @ApiProperty({ required: false, enum: JumpGroupType })
    @IsOptional()
    @IsEnum(JumpGroupType)
    public jumpGroupType?: JumpGroupType;

    @ApiProperty({ required: false, enum: ShellJumpTerminalType })
    @IsOptional()
    @IsEnum(ShellJumpTerminalType)
    public terminalType?: ShellJumpTerminalType;

    @ApiProperty({ required: false, type: Number })
    @IsOptional()
    @IsInt()
    public keepAliveIdleSessionInSeconds?: number;

    @AssetTag({ required: false })
    public tag?: string;

    @ApiProperty({ required: false, type: String })
    @IsOptional()
    @IsString()
    public comments?: string;

    @ApiProperty({ required: false, type: Number, nullable: true })
    @IsOptional()
    @IsInt()
    public jumpPolicyId?: number | null;

    @ApiProperty({ required: false, type: String })
    @IsOptional()
    @IsString()
    public username?: string;

    @ApiProperty({ required: false, type: Number, nullable: true })
    @IsOptional()
    @IsInt()
    public sessionPolicyId?: number | null;
}
