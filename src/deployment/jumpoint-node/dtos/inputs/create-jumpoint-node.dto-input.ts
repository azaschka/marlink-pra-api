import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { JumpointNodeBusinessUnit, JumpointNodeHypervisorType } from '../../enums';

export class CreateJumpointNodeDtoInput {
    @ApiProperty({
        type: String,
        required: true,
        description: 'The key of the site where the jumpoint node will be created.',
    })
    @IsString()
    @IsNotEmpty()
    public siteKey!: string;

    @ApiProperty({
        enum: JumpointNodeBusinessUnit,
        required: true,
        description: 'The business unit associated with the jumpoint node.',
    })
    @IsEnum(JumpointNodeBusinessUnit)
    @IsNotEmpty()
    public businessUnit!: JumpointNodeBusinessUnit;

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
