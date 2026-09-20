import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AssetTag } from '../../../../shared/decorators';
import { JumpGroupType, WebJumpUsernameFormatType } from '../../enums';

export class CreateWebJumpDtoInput {
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
    public url!: string;

    @ApiProperty({ required: true, type: Number })
    @IsNotEmpty()
    @IsInt()
    public jumpGroupId!: number;

    @ApiProperty({ required: false, enum: JumpGroupType })
    @IsOptional()
    @IsEnum(JumpGroupType)
    public jumpGroupType?: JumpGroupType;

    @ApiProperty({ required: false, enum: WebJumpUsernameFormatType })
    @IsOptional()
    @IsEnum(WebJumpUsernameFormatType)
    public usernameFormatType?: WebJumpUsernameFormatType;

    @ApiProperty({ required: false, type: Boolean })
    @IsOptional()
    @IsBoolean()
    public mustVerifyCertificate?: boolean;

    @ApiProperty({ required: false, type: Number })
    @IsOptional()
    @IsInt()
    public authenticationTimeoutInSeconds?: number;

    @AssetTag()
    public tag!: string;

    @ApiProperty({ required: false, type: String })
    @IsOptional()
    @IsString()
    public comments?: string;

    @ApiProperty({ required: false, type: Number, nullable: true })
    @IsOptional()
    @IsInt()
    public jumpPolicyId?: number | null;

    @ApiProperty({ required: false, type: String, nullable: true })
    @IsOptional()
    @IsString()
    public usernameField?: string | null;

    @ApiProperty({ required: false, type: String, nullable: true })
    @IsOptional()
    @IsString()
    public passwordField?: string | null;

    @ApiProperty({ required: false, type: String, nullable: true })
    @IsOptional()
    @IsString()
    public submitField?: string | null;

    @ApiProperty({ required: false, type: Number, nullable: true })
    @IsOptional()
    @IsInt()
    public sessionPolicyId?: number | null;
}
