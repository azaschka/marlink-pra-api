import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional } from 'class-validator';

export class ModifyCustomerDtoInput {
    @ApiProperty({
        required: false,
        type: Number,
        description: 'The identifier of the BeyondTrust instance associated with this customer.',
    })
    @IsNumber()
    @IsOptional()
    public beyondtrustInstanceId?: number;
}
