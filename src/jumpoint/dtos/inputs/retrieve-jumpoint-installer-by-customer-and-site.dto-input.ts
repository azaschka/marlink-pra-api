import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { BusinessUnit } from '../../../customer/enums';

export class RetrieveJumpointInstallerByCustomerAndSiteDtoInput {
    @ApiProperty({
        required: false,
        isArray: true,
        enum: BusinessUnit,
        description: 'The business units to be filtered.',
    })
    @IsOptional()
    @IsEnum(BusinessUnit, { each: true })
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
    public businessUnits?: BusinessUnit[];

    @ApiProperty({
        required: false,
        type: String,
        description: 'Unique key for the customer.',
    })
    @IsString()
    @IsOptional()
    public customerKey?: string;

    @ApiProperty({
        required: true,
        type: String,
        description: 'Unique key for the site.',
    })
    @IsString()
    @IsNotEmpty()
    public siteKey!: string;
}
