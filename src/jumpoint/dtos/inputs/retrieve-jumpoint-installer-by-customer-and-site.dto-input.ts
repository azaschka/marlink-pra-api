import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { BusinessUnit } from '../../../customer/enums';

export class RetrieveJumpointInstallerByCustomerAndSiteDtoInput {
    @ApiProperty({
        required: true,
        enum: BusinessUnit,
        description: 'Business unit of the customer.',
    })
    @IsEnum(BusinessUnit)
    @IsNotEmpty()
    public businessUnit!: BusinessUnit;

    @ApiProperty({
        required: true,
        type: String,
        description: 'Unique key for the customer.',
    })
    @IsString()
    @IsNotEmpty()
    public customerKey!: string;

    @ApiProperty({
        required: true,
        type: String,
        description: 'Unique key for the site.',
    })
    @IsString()
    @IsNotEmpty()
    public siteKey!: string;
}
