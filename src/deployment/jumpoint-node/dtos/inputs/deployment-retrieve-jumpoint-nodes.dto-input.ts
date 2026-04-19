import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';
import { JumpointNodeBusinessUnit, JumpointNodeHypervisorType } from '../../enums';

export class DeploymentRetrieveJumpointNodesDtoInput {
    @ApiProperty({
        required: false,
        type: Number,
        default: 100,
        description: 'The number of items to include in a paginated response.',
    })
    @Type(() => Number)
    @IsInt()
    @IsOptional()
    public pageSize: number = 100;

    @ApiProperty({
        required: false,
        type: Number,
        default: 1,
        description: 'The 1-based index of the desired page.',
    })
    @Type(() => Number)
    @IsInt()
    @IsOptional()
    public pageNumber: number = 1;

    @ApiProperty({
        type: String,
        required: false,
        description: 'The name of the jumpoint node cert.',
    })
    @IsString()
    @IsOptional()
    public certname?: string;

    @ApiProperty({
        enum: JumpointNodeBusinessUnit,
        required: false,
        isArray: true,
        description: 'The business units associated with the jumpoint node.',
    })
    @IsEnum(JumpointNodeBusinessUnit, { each: true })
    @IsOptional()
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
    public businessUnits?: JumpointNodeBusinessUnit[];

    @ApiProperty({
        type: String,
        required: false,
        description: 'The key of the site where the jumpoint node will be created.',
    })
    @IsString()
    @IsOptional()
    public siteKey?: string;

    @ApiProperty({
        type: String,
        required: false,
        description: 'The name of the customer associated with the jumpoint node.',
        nullable: true,
    })
    @IsString()
    @IsOptional()
    public customerName?: string | null;

    @ApiProperty({
        type: String,
        required: false,
        description: 'The domain of the Puppet server associated with the jumpoint node.',
    })
    @IsString()
    @IsOptional()
    public puppetServerDomain?: string;

    @ApiProperty({
        type: String,
        required: false,
        description: 'The ID of the hypervisor associated with the jumpoint node.',
    })
    @IsString()
    @IsOptional()
    public hypervisorId?: string;

    @ApiProperty({
        enum: JumpointNodeHypervisorType,
        required: false,
        description: 'The type of the hypervisor associated with the jumpoint node.',
    })
    @IsEnum(JumpointNodeHypervisorType)
    @IsOptional()
    public hypervisorType?: JumpointNodeHypervisorType;

    @ApiProperty({
        type: Number,
        required: false,
        description: 'The ID of the VM associated with the jumpoint node.',
    })
    @IsNumber()
    @IsOptional()
    public vmId?: number;
}
