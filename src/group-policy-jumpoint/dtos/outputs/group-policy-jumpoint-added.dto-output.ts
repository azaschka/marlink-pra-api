import { ApiProperty } from '@nestjs/swagger';
import { GroupPolicyJumpoint } from '../../models';

export class GroupPolicyJumpointAddedDtoOutput implements GroupPolicyJumpoint {
    @ApiProperty({ required: true, type: Number, description: 'The unique identifier of the group policy.' })
    public groupPolicyId!: number;

    @ApiProperty({ required: true, type: Number, description: 'The unique identifier of the jumpoint.' })
    public jumpointId!: number;

    @ApiProperty({
        required: true,
        type: Date,
        description:
            'The date which the group policy jumpoint was last synchronized with BeyondTrust Privileged Remote Access system.',
    })
    public lastSyncDate!: Date;
}
