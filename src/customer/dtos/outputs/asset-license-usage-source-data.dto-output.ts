import { ApiProperty } from '@nestjs/swagger';
import { JumpItemType } from '../../enums';
import { AssetLicenseUsageSourceData } from '../../models';

export class AssetLicenseUsageSourceDataDtoOutput implements AssetLicenseUsageSourceData {
    @ApiProperty({
        required: true,
        type: Date,
        description: 'The last sync date of the group policy jump group.',
    })
    public groupPolicyJumpGroupLastSyncDate!: Date;

    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier of the jump group.',
    })
    public jumpGroupId!: number;

    @ApiProperty({
        required: true,
        type: String,
        description: 'The name of the jump group.',
    })
    public jumpGroupName!: string;

    @ApiProperty({
        required: true,
        type: Date,
        description: 'The last sync date of the jump group.',
    })
    public jumpGroupLastSyncDate!: Date;

    @ApiProperty({
        required: true,
        enum: JumpItemType,
        description: 'The type of the jump item.',
    })
    public jumpItemType!: JumpItemType;

    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier of the jump item.',
    })
    public jumpItemId!: number;

    @ApiProperty({
        required: false,
        type: String,
        description: 'The name of the jump item.',
    })
    public jumpItemName?: string;

    @ApiProperty({
        required: false,
        type: Number,
        description: 'The unique identifier of the jump point.',
    })
    public jumpItemJumpointId?: number;

    @ApiProperty({
        required: false,
        type: String,
        description: 'The hostname of the jump item.',
    })
    public jumpItemHostname?: string;

    @ApiProperty({
        required: false,
        type: String,
        description: 'The endpoint URL of the jump item.',
    })
    public jumpItemEndpointUrl?: string;

    @ApiProperty({
        required: false,
        type: String,
        description: 'The fully qualified domain name (FQDN) of the jump item.',
    })
    public jumpItemFqdn?: string;

    @ApiProperty({
        required: true,
        type: Date,
        description: 'The last sync date of the jump item.',
    })
    public jumpItemLastSyncDate!: Date;

    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier of the group policy.',
    })
    public groupPolicyId!: number;

    @ApiProperty({
        required: true,
        type: String,
        description: 'The name of the group policy.',
    })
    public groupPolicyName!: string;

    @ApiProperty({
        required: true,
        type: Date,
        description: 'The last sync date of the group policy.',
    })
    public groupPolicyLastSyncDate!: Date;
}
