import { ApiProperty } from '@nestjs/swagger';
import { SiteSupportTeamAccessLevel, SiteSupportTeamTrustLevel } from '../../enums';
import { UserSourceType } from '../../../user/enums';
import { SiteSupportTeamMember } from '../../models';

export class SiteSupportTeamMemberDtoOutput implements SiteSupportTeamMember {
    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier of the site support team member.',
    })
    public id!: number;

    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier of the site to which the support team member belongs.',
    })
    public siteId!: number;

    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier of the user associated with the site support team member.',
    })
    public userId!: number;

    @ApiProperty({
        required: true,
        enum: UserSourceType,
        description: 'The source type of the user associated with the site support team member.',
    })
    public sourceType!: UserSourceType;

    @ApiProperty({
        required: true,
        type: String,
        description: 'The firstname of the site support team member.',
    })
    public firstname!: string;

    @ApiProperty({
        required: true,
        type: String,
        description: 'The lastname of the site support team member.',
    })
    public lastname!: string;

    @ApiProperty({
        required: true,
        type: String,
        description: 'The email of the site support team member.',
    })
    public email!: string;

    @ApiProperty({
        required: true,
        type: String,
        description: 'The support team name of the site support team member.',
    })
    public supportTeamName!: string;

    @ApiProperty({
        required: true,
        enum: SiteSupportTeamAccessLevel,
        description: 'The access level of the site support team member.',
    })
    public supportTeamAccessLevel!: SiteSupportTeamAccessLevel;

    @ApiProperty({
        required: true,
        enum: SiteSupportTeamTrustLevel,
        description: 'The trust level of the site support team member.',
    })
    public supportTeamTrustLevel!: SiteSupportTeamTrustLevel;

    @ApiProperty({
        required: true,
        type: Date,
        description: 'The creation date of the site support team member record.',
    })
    public creationDate!: Date;

    @ApiProperty({
        required: false,
        type: Date,
        description: 'The last modification date of the site support team member record.',
    })
    public lastModificationDate?: Date;
}
