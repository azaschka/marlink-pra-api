import { ApiProperty } from '@nestjs/swagger';
import { SiteApprover } from '../../models';

export class SiteApproverDtoOutput implements SiteApprover {
    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier of the site approver.',
    })
    public id!: number;

    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier of the site to which the approver belongs.',
    })
    public siteId!: number;

    @ApiProperty({
        required: true,
        type: String,
        description: 'The email of the site approver.',
    })
    public email!: string;

    @ApiProperty({
        required: true,
        type: Date,
        description: 'The creation date of the site approver record.',
    })
    public creationDate!: Date;

    @ApiProperty({
        required: false,
        type: Date,
        description: 'The last modification date of the site approver record.',
    })
    public lastModificationDate?: Date;
}
