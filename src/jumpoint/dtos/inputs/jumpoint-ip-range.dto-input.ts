import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { JumpointIpRange } from '../../models';

export class JumpointIpRangeDtoInput implements JumpointIpRange {
    @ApiProperty({
        required: true,
        type: String,
        description: 'The starting IPv4 address of the range.',
    })
    @IsString()
    @IsNotEmpty()
    public start!: string;

    @ApiProperty({
        required: true,
        type: String,
        description: 'The ending IPv4 address of the range.',
    })
    @IsString()
    @IsNotEmpty()
    public end!: string;
}
