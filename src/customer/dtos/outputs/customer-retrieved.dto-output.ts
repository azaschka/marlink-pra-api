import { ApiProperty } from '@nestjs/swagger';
import { BusinessUnit } from '../../../beyondtrust-instance/enums';
import { Customer } from '../../models';

export class CustomerRetrievedDtoOutput implements Customer {
    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier assigned to this customer by the appliance.',
    })
    public id!: number;

    @ApiProperty({
        required: true,
        type: String,
        description: 'Unique key for the customer.',
    })
    public key!: string;

    @ApiProperty({
        required: true,
        type: String,
        description: 'Unique name of the customer.',
    })
    public name!: string;

    @ApiProperty({
        required: true,
        enum: BusinessUnit,
        description: 'Business unit of the customer.',
    })
    public businessUnit!: BusinessUnit;

    @ApiProperty({
        required: true,
        type: Boolean,
        description: 'Indicates whether the customer is deactivated.',
    })
    public isDeactivated!: boolean;

    @ApiProperty({
        required: true,
        type: Number,
        description: 'The identifier of the BeyondTrust instance associated with this customer.',
    })
    public beyondtrustInstanceId!: number;

    @ApiProperty({
        required: true,
        type: Date,
        description: 'The date and time when this customer was created.',
    })
    public creationDate!: Date;

    @ApiProperty({
        required: false,
        type: Date,
        description: 'The date and time when this customer was last modified.',
    })
    public lastModificationDate?: Date;
}
