import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { NameSanitizerUtility } from '../../../../shared/utilities';
import { JumpGroupType, TunnelType } from '../../enums';

export class ModifyProtocolTunnelJumpDtoInput {
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

    @ApiProperty({ required: false, type: Number, nullable: true })
    @IsOptional()
    @IsInt()
    public sessionPolicyId?: number | null;

    @ApiProperty({ required: false, type: String })
    @IsOptional()
    @IsString()
    public tunnelListenAddress?: string;

    @ApiProperty({ required: false, type: String })
    @IsOptional()
    @IsString()
    public tunnelDefinitions?: string;

    @ApiProperty({ required: false, enum: TunnelType })
    @IsOptional()
    @IsEnum(TunnelType)
    public tunnelType?: TunnelType;

    @ApiProperty({ required: false, type: String })
    @IsOptional()
    @IsString()
    public username?: string;

    @ApiProperty({ required: false, type: String })
    @IsOptional()
    @IsString()
    public database?: string;

    @ApiProperty({ required: false, type: String })
    @IsOptional()
    @IsString()
    public url?: string;

    @ApiProperty({ required: false, type: String })
    @IsOptional()
    @IsString()
    public caCertificates?: string;
}
