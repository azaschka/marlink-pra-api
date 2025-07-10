import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { SiteApproverDtoInput } from './site-approver.dto-input';

export class ModifySiteDtoInput {
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
