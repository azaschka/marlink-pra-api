import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { SiteSupportTeamAccessLevel, SiteSupportTeamTrustLevel } from '../../enums';

export class SiteSupportTeamMemberDtoInput {
    @ApiProperty({
        required: true,
        type: String,
        description: 'The firstname of the site support team member.',
    })
    @IsNotEmpty()
    @IsString()
    public firstname!: string;

    @ApiProperty({
        required: true,
        type: String,
        description: 'The lastname of the site support team member.',
    })
    @IsNotEmpty()
    @IsString()
    public lastname!: string;

    @ApiProperty({
        required: true,
        type: String,
        description: 'The email of the site support team member.',
    })
    @IsNotEmpty()
    @IsString()
    public email!: string;

    @ApiProperty({
        required: true,
        type: String,
        description: 'The support team name of the site support team member.',
    })
    @IsNotEmpty()
    @IsString()
    public supportTeamName!: string;

    @ApiProperty({
        required: true,
        enum: SiteSupportTeamAccessLevel,
        description: 'The access level of the site support team member.',
    })
    @IsNotEmpty()
    @IsEnum(SiteSupportTeamAccessLevel)
    public supportTeamAccessLevel!: SiteSupportTeamAccessLevel;

    @ApiProperty({
        required: true,
        enum: SiteSupportTeamTrustLevel,
        description: 'The trust level of the site support team member.',
    })
    @IsNotEmpty()
    @IsEnum(SiteSupportTeamTrustLevel)
    public supportTeamTrustLevel!: SiteSupportTeamTrustLevel;
}
