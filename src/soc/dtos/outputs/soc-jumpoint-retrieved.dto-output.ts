import { ApiProperty } from '@nestjs/swagger';
import { JumpointRetrievedDtoOutput } from '../../../jumpoint/dtos/outputs';
import { Jumpoint } from '../../../jumpoint/models';
import { SocCustomerSiteMappingStatus } from '../../enums';
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

    @ApiProperty({
        required: true,
        enum: SocCustomerSiteMappingStatus,
        description:
            'States how far this jumpoint could be attributed to a customer/site. ' +
            '"unmapped" identifies a jumpoint without an identifiable owner.',
    })
    public mappingStatus!: SocCustomerSiteMappingStatus;
}
