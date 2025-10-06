import { ApiProperty } from '@nestjs/swagger';
import { UserRetrievedDtoOutput } from '../../../user/dtos/outputs';
import { UserTeamRoleType } from '../../enums';
import { TeamUser } from '../../models';

export class TeamUserRetrievedDtoOutput implements TeamUser {
    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier of the team to which this user has access.',
    })
    public teamId!: number;

    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier of the user who has access to the team.',
    })
    public userId!: number;

    @ApiProperty({ required: true, enum: UserTeamRoleType })
    public roleType!: UserTeamRoleType;

    @ApiProperty({
        required: true,
        type: UserRetrievedDtoOutput,
        description: 'The user associated with the team.',
    })
    public user!: UserRetrievedDtoOutput;

    @ApiProperty({
        required: true,
        type: Date,
        description:
            'The date which the team user was last synchronized with BeyondTrust Privileged Remote Access system.',
    })
    public lastSyncDate!: Date;
}
