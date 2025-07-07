import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsString } from 'class-validator';
import { JumpGroupType } from '../../enums';

export class CopyProtocolTunnelJumpDtoInput {
    @ApiProperty({ required: true, type: Number })
    @IsNotEmpty()
    @IsInt()
    public jumpGroupId!: number;

    @ApiProperty({ required: true, enum: JumpGroupType })
    @IsNotEmpty()
    @IsEnum(JumpGroupType)
    public jumpGroupType!: JumpGroupType;

    @ApiProperty({ required: true, type: String })
    @IsNotEmpty()
    @IsString()
    public name!: string;
}
