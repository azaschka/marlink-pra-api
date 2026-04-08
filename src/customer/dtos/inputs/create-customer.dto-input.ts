import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { NameSanitizerUtility } from '../../../shared/utilities';
import { BusinessUnit } from '../../../beyondtrust-instance/enums';

export class CreateCustomerDtoInput {
    @ApiProperty({
        required: true,
        type: String,
        description: 'Unique key for the customer.',
    })
    @Transform(({ value }) => NameSanitizerUtility.sanitizeKey(value))
    @IsString()
    @IsNotEmpty()
    public key!: string;

    @ApiProperty({
        required: true,
        type: String,
        description: 'Unique name of the customer.',
    })
    @Transform(({ value }) => NameSanitizerUtility.sanitizeName(value))
    @IsString()
    @IsNotEmpty()
    public name!: string;

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
        type: Number,
        description: 'The identifier of the BeyondTrust instance associated with this customer.',
    })
    @IsNumber()
    @IsNotEmpty()
    public beyondtrustInstanceId!: number;
}
