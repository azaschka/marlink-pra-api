import { ApiProperty } from '@nestjs/swagger';
import { DiscrepancyEntityType, DiscrepancyScanState } from '../../enums';
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

    @ApiProperty({
        required: false,
        enum: DiscrepancyScanState,
        description:
            'Final state of the scan of this entity type. Anything other than "succeeded" means that the lists above are incomplete. Absent when the Sync API is older than 3.2.',
    })
    public state?: DiscrepancyScanState;

    @ApiProperty({
        required: false,
        type: String,
        description: 'Kind of error when the state is "failed" or "skipped" (e.g. NotFound, InstanceUnavailable).',
    })
    public failureKind?: string;
}
