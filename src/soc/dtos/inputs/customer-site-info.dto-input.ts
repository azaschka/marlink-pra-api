import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CustomerSiteInfo } from '../../models';

export class CustomerSiteInfoDtoInput implements CustomerSiteInfo {
    @ApiProperty({
        required: false,
        type: String,
        description: 'The key of the customer.',
    })
    @IsString()
    @IsOptional()
    public customerKey?: string;

    @ApiProperty({
        required: false,
        type: String,
        description: 'The key of the site.',
    })
    @IsString()
    @IsOptional()
    public siteKey?: string;
}
