import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SocCustomerSiteMappingStatus } from '../../enums';
import { PaginationDtoInput } from './pagination.dto-input';

/**
 * Query parameters shared by all SOC endpoints.
 *
 * Every filter is optional: calling an endpoint without any parameter is the primary
 * use case ("get all") and returns everything the access key is allowed to see.
 */
export class SocFilterDtoInput extends PaginationDtoInput {
    @ApiProperty({
        required: false,
        type: String,
        description: 'Restricts the results to the customer with this key.',
    })
    @IsString()
    @IsOptional()
    public customerKey?: string;

    @ApiProperty({
        required: false,
        type: String,
        description: 'Restricts the results to the site with this key.',
    })
    @IsString()
    @IsOptional()
    public siteKey?: string;

    @ApiProperty({
        required: false,
        enum: SocCustomerSiteMappingStatus,
        description:
            'Restricts the results to objects with this attribution status. ' +
            'Use "unmapped" to list remote access paths that cannot be attributed to any customer or site.',
    })
    @IsEnum(SocCustomerSiteMappingStatus)
    @IsOptional()
    public mappingStatus?: SocCustomerSiteMappingStatus;
}
