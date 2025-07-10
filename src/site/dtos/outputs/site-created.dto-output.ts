import { ApiProperty } from '@nestjs/swagger';
import { Site, SiteApprover } from '../../models';
import { SiteApproverDtoOutput } from './site-approver.dto-output';

export class SiteCreatedDtoOutput implements Site {
    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier assigned to this site by the appliance.',
    })
    public id!: number;

    @ApiProperty({
        required: true,
        type: String,
        description: 'The unique key of the site.',
    })
    public key!: string;

    @ApiProperty({ required: true, type: String, description: 'The name of the site.' })
    public name!: string;

    @ApiProperty({
        required: true,
        type: String,
        description: 'The key of the customer to which this site belongs.',
    })
    public customerKey!: string;

    @ApiProperty({
        required: true,
        type: [SiteApproverDtoOutput],
    })
    public approvers!: SiteApprover[];

    @ApiProperty({
        required: true,
        type: Date,
        description: 'The date and time when this site was created.',
    })
    public creationDate!: Date;

    @ApiProperty({
        required: false,
        type: Date,
        description: 'The date and time when this site was last modified.',
    })
    public lastModificationDate?: Date;
}
