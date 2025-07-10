import { ApiProperty } from '@nestjs/swagger';
import { SiteApprover } from '../../models';

export class SiteApproverDtoOutput implements SiteApprover {
    @ApiProperty({
        required: true,
        type: String,
    })
    public username!: string;

    @ApiProperty({
        required: true,
        type: String,
    })
    public email!: string;
}
