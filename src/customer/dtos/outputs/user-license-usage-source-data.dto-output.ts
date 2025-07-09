import { ApiProperty } from '@nestjs/swagger';
import { UserLicenseUsageSourceData } from '../../models';

export class UserLicenseUsageSourceDataDtoOutput implements UserLicenseUsageSourceData {
    @ApiProperty({
        required: true,
        type: Date,
        description: 'The last sync date of the group policy member.',
    })
    public groupPolicyMemberLastSyncDate!: Date;

    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier of the member.',
    })
    public memberId!: number;

    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier of the user.',
    })
    public userId!: number;

    @ApiProperty({
        required: false,
        type: String,
        description: 'The username of the user.',
    })
    public username?: string;

    @ApiProperty({
        required: true,
        type: Date,
        description: 'The last sync date of the user.',
    })
    public userLastSyncDate!: Date;

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
