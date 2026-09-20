import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { NameSanitizerUtility } from '../../../../shared/utilities';
import { JumpGroupType, ShellJumpProtocolType, ShellJumpTerminalType } from '../../enums';

export class CreateShellJumpDtoInput {
    @ApiProperty({ required: true, type: String })
    @IsNotEmpty()
    @IsString()
    public name!: string;

    @ApiProperty({ required: true, type: Number })
    @IsNotEmpty()
    @IsInt()
    public jumpointId!: number;

    @ApiProperty({ required: true, type: String })
    @IsNotEmpty()
    @IsString()
    public hostname!: string;

    @ApiProperty({ required: true, enum: ShellJumpProtocolType })
    @IsNotEmpty()
    @IsEnum(ShellJumpProtocolType)
    public protocolType!: ShellJumpProtocolType;

    @ApiProperty({ required: false, type: Number })
    @IsOptional()
    @IsInt()
    public port?: number;

    @ApiProperty({ required: true, type: Number })
    @IsNotEmpty()
    @IsInt()
    public jumpGroupId!: number;

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

    @ApiProperty({ required: false, type: String })
    @Transform(({ value }) => NameSanitizerUtility.sanitizeTag(value))
    @IsOptional()
    @IsString()
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
