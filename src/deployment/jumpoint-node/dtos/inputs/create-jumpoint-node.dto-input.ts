import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { JumpointNodeBusinessUnit } from '../../enums';

export class CreateJumpointNodeDtoInput {
    @ApiProperty({
        type: String,
        required: true,
        description: 'The key of the site where the jumpoint node will be created.',
    })
    @IsString()
    @IsNotEmpty()
    public siteKey!: string;

    @ApiProperty({
        enum: JumpointNodeBusinessUnit,
        required: true,
        description: 'The business unit associated with the jumpoint node.',
    })
    @IsEnum(JumpointNodeBusinessUnit)
    @IsNotEmpty()
    public businessUnit!: JumpointNodeBusinessUnit;
}
