import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { BillingType, BusinessUnit } from '../../enums';

export class CreateCustomerDtoInput {
    @ApiProperty({
        required: true,
        type: String,
        description: 'Unique key for the customer.',
    })
    @IsString()
    @IsNotEmpty()
    public key!: string;

    @ApiProperty({
        required: true,
        type: String,
        description: 'Unique name of the customer.',
    })
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
        enum: BillingType,
        description: 'Billing type of the customer.',
    })
    @IsEnum(BillingType)
    @IsNotEmpty()
    public billingType!: BillingType;
}
