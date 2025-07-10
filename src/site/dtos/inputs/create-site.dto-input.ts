import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { SiteApproverDtoInput } from './site-approver.dto-input';

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
        type: [SiteApproverDtoInput],
    })
    @IsArray()
    @ArrayNotEmpty()
    @ValidateNested({ each: true })
    @Type(() => SiteApproverDtoInput)
    public approvers!: SiteApproverDtoInput[];
}
