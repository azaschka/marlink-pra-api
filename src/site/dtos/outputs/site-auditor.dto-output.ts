import { ApiProperty } from '@nestjs/swagger';
import { UserSourceType } from '../../../user/enums';
import { SiteAuditor } from '../../models';

export class SiteAuditorDtoOutput implements SiteAuditor {
    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier of the site auditor.',
    })
    public id!: number;

    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier of the site to which the auditor belongs.',
    })
    public siteId!: number;

    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier of the user associated with the site auditor.',
    })
    public userId!: number;

    @ApiProperty({
        required: true,
        enum: UserSourceType,
        description: 'The source type of the user associated with the site auditor.',
    })
    public sourceType!: UserSourceType;

    @ApiProperty({
        required: true,
        type: String,
        description: 'The username of the site auditor.',
    })
    public username!: string;

    @ApiProperty({
        required: true,
        type: String,
        description: 'The email of the site auditor.',
    })
    public email!: string;

    @ApiProperty({
        required: true,
        type: Boolean,
        description: 'Indicates if the auditor is an admin operator.',
    })
    public isAdminOperator!: boolean;

    @ApiProperty({
        required: true,
        type: Date,
        description: 'The creation date of the site auditor record.',
    })
    public creationDate!: Date;

    @ApiProperty({
        required: false,
        type: Date,
        description: 'The last modification date of the site auditor record.',
    })
    public lastModificationDate?: Date;
}
