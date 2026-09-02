import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { NameSanitizerUtility } from '../../../shared/utilities';
import { SiteSupportTeamAccessLevel, SiteSupportTeamTrustLevel, UserSourceType } from '../../enums';

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
    @Transform(({ value }) => NameSanitizerUtility.sanitizeName(value))
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

    @ApiProperty({
        required: true,
        enum: UserSourceType,
        description: 'The source type of the site support team member.',
        default: UserSourceType.Internal,
    })
    @IsEnum(UserSourceType)
    public sourceType: UserSourceType = UserSourceType.Internal;
}
