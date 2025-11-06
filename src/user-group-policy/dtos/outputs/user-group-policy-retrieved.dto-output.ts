import { ApiProperty } from '@nestjs/swagger';
import { GroupPolicyRetrievedDtoOutput } from '../../../group-policy/dtos/outputs';
import { UserGroupPolicy } from '../../models';

export class UserGroupPolicyRetrievedDtoOutput implements UserGroupPolicy {
    @ApiProperty({ required: true, type: Number, description: 'The unique identifier for the user.' })
    public userId!: number;

    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier for the group policy.',
    })
    public groupPolicyId!: number;

    @ApiProperty({
        required: true,
        type: GroupPolicyRetrievedDtoOutput,
        description: 'The group policy details associated with the user.',
    })
    public groupPolicy!: GroupPolicyRetrievedDtoOutput;

    @ApiProperty({
        required: true,
        type: Date,
        description:
            'The date which the user group policy was last synchronized with BeyondTrust Privileged Remote Access system.',
    })
    public lastSyncDate!: Date;
}
