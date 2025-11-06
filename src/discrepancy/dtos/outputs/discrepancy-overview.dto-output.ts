import { ApiProperty } from '@nestjs/swagger';
import { DiscrepancyEntityType } from '../../enums';
import { DiscrepancyOverview } from '../../models';

export class DiscrepancyOverviewDtoOutput implements DiscrepancyOverview {
    @ApiProperty({ required: true, enum: DiscrepancyEntityType, description: 'Entity Type' })
    public entityType!: DiscrepancyEntityType;

    @ApiProperty({ required: true, type: Number, description: 'Total BT Data' })
    public totalBtData!: number;

    @ApiProperty({ required: true, type: Number, description: 'Total DB Data' })
    public totalDbData!: number;

    @ApiProperty({ required: true, type: [Number], description: 'Identical IDs' })
    public identicalIds!: number[];

    @ApiProperty({ required: true, type: [Number], description: 'Only in external IDs (BT)' })
    public onlyInExternalIds!: number[];

    @ApiProperty({ required: true, type: [Number], description: 'Only in internal IDs (DB)' })
    public onlyInInternalIds!: number[];

    @ApiProperty({ required: true, type: [Number], description: 'Mismatched IDs' })
    public mismatchedIds!: number[];
}
