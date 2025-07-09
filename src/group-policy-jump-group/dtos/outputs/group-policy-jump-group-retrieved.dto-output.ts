import { ApiProperty } from '@nestjs/swagger';
import { JumpGroupRetrievedDtoOutput } from '../../../jump-group/dtos/outputs';
import { GroupPolicyJumpGroup } from '../../models';

export class GroupPolicyJumpGroupRetrievedDtoOutput implements GroupPolicyJumpGroup {
    @ApiProperty({ required: true, type: Number, description: 'The unique identifier of the group policy.' })
    public groupPolicyId!: number;

    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier assigned to a Jump Group.',
    })
    public jumpGroupId!: number;

    @ApiProperty({
        required: false,
        type: Number,
        description: `The unique identifier assigned to a Jump Item Role or 0 meaning "User's Default".`,
    })
    public jumpItemRoleId?: number;

    @ApiProperty({
        required: false,
        type: Number,
        description: `The unique identifier assigned to a Jump Policy or 0 meaning "Set on Jump Items".`,
    })
    public jumpPolicyId?: number;

    @ApiProperty({
        required: true,
        type: JumpGroupRetrievedDtoOutput,
        description: 'The jump group associated with the group policy.',
    })
    public jumpGroup!: JumpGroupRetrievedDtoOutput;

    @ApiProperty({
        required: true,
        type: Date,
        description:
            'The date which the group policy jump group was last synchronized with BeyondTrust Privileged Remote Access system.',
    })
    public lastSyncDate!: Date;
}
