import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { BillingType } from '../../enums';

export class ModifyCustomerDtoInput {
    @ApiProperty({
        required: false,
        enum: BillingType,
        description: 'Billing type of the customer.',
    })
    @IsEnum(BillingType)
    @IsOptional()
    public billingType?: BillingType;
}
