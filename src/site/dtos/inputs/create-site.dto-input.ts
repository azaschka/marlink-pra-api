import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, ArrayUnique, IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { SiteAuditorDtoInput } from './site-auditor.dto-input';
import { SiteManagerDtoInput } from './site-manager.dto-input';
import { SiteSupportTeamMemberDtoInput } from './site-support-team-member.dto-input';

export class CreateSiteDtoInput {
    @ApiProperty({
        required: true,
        type: String,
        description: 'The unique key of the site.',
    })
    @IsNotEmpty()
    @IsString()
    public key!: string;

    @ApiProperty({ required: true, type: String, description: 'The name of the site.' })
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
        description: 'The list of site auditors.',
    })
    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => SiteAuditorDtoInput)
    public siteAuditors?: SiteAuditorDtoInput[];

    @ApiProperty({
        required: false,
        type: [SiteSupportTeamMemberDtoInput],
        description: 'The list of site support team members.',
    })
    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => SiteSupportTeamMemberDtoInput)
    public siteSupportTeamMembers?: SiteSupportTeamMemberDtoInput[];

    @ApiProperty({
        required: false,
        type: [String],
        description: 'The list of site approver emails.',
    })
    @IsArray()
    @ArrayUnique()
    @IsOptional()
    @IsString({ each: true })
    public siteApprovers?: string[];
}
