import { ApiProperty } from '@nestjs/swagger';
import { SiteAdministrator } from '../../models';

export class SiteAdministratorDtoOutput implements SiteAdministrator {
    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier of the site administrator.',
    })
    public id!: number;

    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier of the site to which the administrator belongs.',
    })
    public siteId!: number;

    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier of the user associated with the site administrator.',
    })
    public userId!: number;

    @ApiProperty({
        required: true,
        type: String,
        description: 'The username of the site administrator.',
    })
    public username!: string;

    @ApiProperty({
        required: true,
        type: String,
        description: 'The email of the site administrator.',
    })
    public email!: string;

    @ApiProperty({
        required: true,
        type: Boolean,
        description: 'Indicates if the administrator is an admin operator.',
    })
    public isAdminOperator!: boolean;

    @ApiProperty({
        required: true,
        type: Date,
        description: 'The creation date of the site administrator record.',
    })
    public creationDate!: Date;

    @ApiProperty({
        required: false,
        type: Date,
        description: 'The last modification date of the site administrator record.',
    })
    public lastModificationDate?: Date;
}
