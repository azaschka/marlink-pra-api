import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ArrayNotEmpty, ArrayUnique, IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { NameSanitizerUtility } from '../../../shared/utilities';
import { SiteAuditorDtoInput } from './site-auditor.dto-input';
import { SiteManagerDtoInput } from './site-manager.dto-input';
import { SiteSupportTeamMemberDtoInput } from './site-support-team-member.dto-input';

export class CreateSiteDtoInput {
    @ApiProperty({
        required: true,
        type: String,
        description: 'The unique key of the site.',
    })
    @Transform(({ value }) => NameSanitizerUtility.sanitizeKey(value))
    @IsNotEmpty()
    @IsString()
    public key!: string;

    @ApiProperty({ required: true, type: String, description: 'The name of the site.' })
    @Transform(({ value }) => NameSanitizerUtility.sanitizeName(value))
    @IsNotEmpty()
    @IsString()
    public name!: string;

    @ApiProperty({
        required: true,
        type: String,
        description: 'The key of the customer to which this site belongs.',
    })
    @IsNotEmpty()
    @IsString()
    public customerKey!: string;

    @ApiProperty({
        required: true,
        type: [SiteManagerDtoInput],
    })
    @IsArray()
    @ArrayNotEmpty()
    @ValidateNested({ each: true })
    @Type(() => SiteManagerDtoInput)
    public siteManagers!: SiteManagerDtoInput[];

    @ApiProperty({
        required: false,
        type: [SiteAuditorDtoInput],
        description:
            'The complete list of site auditors. Omit it to keep the existing auditors of an existing site unchanged; an empty list removes them.',
    })
    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => SiteAuditorDtoInput)
    public siteAuditors?: SiteAuditorDtoInput[];

    @ApiProperty({
        required: false,
        type: [SiteSupportTeamMemberDtoInput],
        description:
            'The complete list of site support team members. Omit it to keep the existing members of an existing site unchanged; an empty list removes them.',
    })
    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => SiteSupportTeamMemberDtoInput)
    public siteSupportTeamMembers?: SiteSupportTeamMemberDtoInput[];

    @ApiProperty({
        required: false,
        type: [String],
        description:
            'The complete list of site approver emails. Omit it to keep the existing approvers of an existing site unchanged; an empty list removes them.',
    })
    @IsArray()
    @ArrayUnique()
    @IsOptional()
    @IsString({ each: true })
    public siteApprovers?: string[];
}
