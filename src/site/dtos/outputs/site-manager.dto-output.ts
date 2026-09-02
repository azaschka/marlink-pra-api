import { ApiProperty } from '@nestjs/swagger';
import { UserSourceType } from '../../enums';
import { SiteManager } from '../../models';

export class SiteManagerDtoOutput implements SiteManager {
    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier of the site manager.',
    })
    public id!: number;

    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier of the site to which the manager belongs.',
    })
    public siteId!: number;

    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier of the user associated with the site manager.',
    })
    public userId!: number;

    @ApiProperty({
        required: true,
        enum: UserSourceType,
        description: 'The source type of the user associated with the site manager.',
    })
    public sourceType!: UserSourceType;

    @ApiProperty({
        required: true,
        type: String,
        description: 'The username of the site manager.',
    })
    public username!: string;

    @ApiProperty({
        required: true,
        type: String,
        description: 'The email of the site manager.',
    })
    public email!: string;

    @ApiProperty({
        required: true,
        type: Date,
        description: 'The creation date of the site manager record.',
    })
    public creationDate!: Date;

    @ApiProperty({
        required: false,
        type: Date,
        description: 'The last modification date of the site manager record.',
    })
    public lastModificationDate?: Date;
}
