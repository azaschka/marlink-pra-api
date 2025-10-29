import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { BusinessUnit } from '../../../customer/enums';

export class AccessScopeDtoInput {
    @ApiProperty({
        required: true,
        isArray: true,
        enum: BusinessUnit,
        description: 'The business units included in the access scope.',
    })
    @IsNotEmpty()
    @IsEnum(BusinessUnit, { each: true })
    public businessUnits!: BusinessUnit[];
}
