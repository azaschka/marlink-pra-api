import { ApiProperty } from '@nestjs/swagger';
import { Site, SiteAuditor, SiteManager, SiteSupportTeamMember } from '../../models';
import { SiteAuditorDtoOutput } from './site-auditor.dto-output';
import { SiteApproverDtoOutput } from './site-approver.dto-output';
import { SiteManagerDtoOutput } from './site-manager.dto-output';
import { SiteSupportTeamMemberDtoOutput } from './site-support-team-member.dto-output';

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
        type: [SiteManagerDtoOutput],
        description: 'The list of site managers associated with this site.',
    })
    public siteManagers!: SiteManager[];

    @ApiProperty({
        required: true,
        type: [SiteAuditorDtoOutput],
        description: 'The list of site auditors associated with this site.',
    })
    public siteAuditors!: SiteAuditor[];

    @ApiProperty({
        required: true,
        type: [SiteSupportTeamMemberDtoOutput],
        description: 'The list of site support team members associated with this site.',
    })
    public siteSupportTeamMembers!: SiteSupportTeamMember[];

    @ApiProperty({
        required: true,
        type: [SiteApproverDtoOutput],
        description: 'The list of site approvers associated with this site.',
    })
    public siteApprovers!: SiteApproverDtoOutput[];

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
