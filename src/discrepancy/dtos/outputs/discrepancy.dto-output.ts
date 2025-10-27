import { ApiProperty } from '@nestjs/swagger';
import { DiscrepancyEntityType } from '../../enums';
import { Discrepancy } from '../../models';

export class DiscrepancyDtoOutput implements Discrepancy {
    @ApiProperty({ required: true, type: Number, description: 'The id of the discrepancy.' })
    public id!: number;

    @ApiProperty({ required: true, enum: DiscrepancyEntityType, description: 'Entity type' })
    public entityType!: DiscrepancyEntityType;

    @ApiProperty({ required: true, type: Number, description: 'Entity ID' })
    public entityId!: number;

    @ApiProperty({ required: false, type: Object, nullable: true, description: 'Internal data (DB)' })
    public internalData?: Record<string, unknown>;

    @ApiProperty({ required: false, type: Object, nullable: true, description: 'External data (BeyondTrust)' })
    public externalData?: Record<string, unknown>;

    @ApiProperty({ required: true, type: Date, description: 'Creation date' })
    public creationDate!: Date;

    @ApiProperty({ required: false, type: Date, description: 'Last modification date' })
    public lastModificationDate?: Date;
}
