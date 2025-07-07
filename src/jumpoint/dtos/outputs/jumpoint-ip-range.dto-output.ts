import { ApiProperty } from '@nestjs/swagger';
import { JumpointIpRange } from '../../models';

export class JumpointIpRangeDtoOutput implements JumpointIpRange {
    @ApiProperty({
        required: true,
        type: String,
        description: 'The starting IPv4 address of the range.',
    })
    public start!: string;

    @ApiProperty({
        required: true,
        type: String,
        description: 'The ending IPv4 address of the range.',
    })
    public end!: string;
}
