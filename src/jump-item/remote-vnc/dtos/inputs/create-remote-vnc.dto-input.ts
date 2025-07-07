import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { JumpGroupType } from '../../enums';

export class CreateRemoteVncDtoInput {
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

    @ApiProperty({ required: false, type: Number, nullable: true })
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

    @ApiProperty({ required: false, type: String })
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
}
