import { ApiProperty } from '@nestjs/swagger';
import { JumpointRetrievedDtoOutput } from '../../../jumpoint/dtos/outputs';
import { Jumpoint } from '../../../jumpoint/models';
import { SocJumpoint } from '../../models';

export class SocJumpointRetrievedDtoOutput implements SocJumpoint {
    @ApiProperty({
        required: true,
        type: JumpointRetrievedDtoOutput,
    })
    public jumpoint!: Jumpoint;

    @ApiProperty({
        required: false,
    })
    public customerKey?: string;

    @ApiProperty({
        required: false,
    })
    public customerName?: string;

    @ApiProperty({
        required: false,
    })
    public siteKey?: string;

    @ApiProperty({
        required: false,
    })
    public siteName?: string;
}
