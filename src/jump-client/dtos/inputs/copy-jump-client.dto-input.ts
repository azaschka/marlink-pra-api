import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsString } from 'class-validator';
import { JumpClientGroupType } from '../../enums';

export class CopyJumpClientDtoInput {
    @ApiProperty({ required: true, type: Number, description: 'The unique identifier assigned to a Jump Group.' })
    @IsInt()
    @IsNotEmpty()
    public jumpGroupId!: number;

    @ApiProperty({
        required: true,
        enum: JumpClientGroupType,
        description: 'The type of Jump Group that owns this Jump Item.',
    })
    @IsEnum(JumpClientGroupType)
    @IsNotEmpty()
    public jumpGroupType!: JumpClientGroupType;

    @ApiProperty({ required: true, type: String, description: 'The name to be used in the new Jump Item.' })
    @IsString()
    @IsNotEmpty()
    public name!: string;
}
