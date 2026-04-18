import { ApiProperty } from '@nestjs/swagger';
import { JumpointNodeBusinessUnit, JumpointNodeHypervisorType, JumpointNodeServiceType } from '../../enums';

export class JumpointNodeRetrievedDtoOutput {
    @ApiProperty({
        type: Number,
        required: true,
        description: 'The unique identifier of the jumpoint node.',
    })
    public id!: number;

    @ApiProperty({
        type: String,
        required: true,
        description: 'The name of the jumpoint node cert.',
    })
    public certname!: string;

    @ApiProperty({
        type: String,
        required: false,
        description: 'The ID of the hypervisor associated with the jumpoint node.',
    })
    public hypervisorId?: string;

    @ApiProperty({
        enum: JumpointNodeHypervisorType,
        required: false,
        description: 'The type of the hypervisor associated with the jumpoint node.',
    })
    public hypervisorType?: JumpointNodeHypervisorType;

    @ApiProperty({
        enum: JumpointNodeBusinessUnit,
        required: true,
        description: 'The business unit associated with the jumpoint node.',
    })
    public businessUnit!: JumpointNodeBusinessUnit;

    @ApiProperty({
        type: String,
        required: true,
        description: 'The key of the site associated with the jumpoint node.',
    })
    public siteKey!: string;

    @ApiProperty({
        type: String,
        required: false,
        description: 'The name of the customer associated with the jumpoint node.',
        nullable: true,
    })
    public customerName?: string | null;

    @ApiProperty({
        type: Number,
        required: false,
        description: 'The ID of the virtual machine associated with the jumpoint node.',
    })
    public vmId?: number;

    @ApiProperty({
        type: String,
        required: true,
        description: 'The status of the jumpoint node.',
    })
    public status!: string;

    @ApiProperty({
        type: String,
        required: true,
        description: 'The domain of the puppet server associated with the jumpoint node.',
    })
    public puppetServerDomain!: string;

    @ApiProperty({
        enum: JumpointNodeServiceType,
        required: false,
        description: 'The type of service associated with the jumpoint node.',
    })
    public serviceType?: JumpointNodeServiceType;

    @ApiProperty({
        type: Boolean,
        required: false,
        description: 'Indicates whether the jumpoint node has approval.',
    })
    public hasApproval?: boolean;

    @ApiProperty({
        type: String,
        required: false,
        description: 'The path to the ISO file associated with the jumpoint node.',
    })
    public isoFilePath?: string;

    @ApiProperty({
        type: Date,
        required: true,
        description: 'The creation date of the jumpoint node.',
    })
    public creationDate!: Date;

    @ApiProperty({
        type: Date,
        required: false,
        description: 'The last modification date of the jumpoint node.',
    })
    public lastModificationDate?: Date;
}
