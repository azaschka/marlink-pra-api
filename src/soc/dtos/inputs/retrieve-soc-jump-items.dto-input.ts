import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { CustomerSiteInfoDtoInput } from './customer-site-info.dto-input';

export class RetrieveSocJumpItemsDtoInput {
    @ApiProperty({
        required: false,
        type: [CustomerSiteInfoDtoInput],
        description: 'Filters results to include only customer-site info with the specified keys.',
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CustomerSiteInfoDtoInput)
    @IsOptional()
    public customerSiteInfo?: CustomerSiteInfoDtoInput[];
}
