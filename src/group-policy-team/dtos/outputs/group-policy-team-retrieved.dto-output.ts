import { ApiProperty } from '@nestjs/swagger';
import { TeamRetrievedDtoOutput } from '../../../team/dtos/outputs';
import { GroupPolicyTeamRoleType } from '../../enums';
import { GroupPolicyTeam } from '../../models';

export class GroupPolicyTeamRetrievedDtoOutput implements GroupPolicyTeam {
    @ApiProperty({ required: true, type: Number, description: 'The unique identifier of the group policy.' })
    public groupPolicyId!: number;

    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier assigned to a team.',
    })
    public teamId!: number;

    @ApiProperty({
        required: false,
        enum: GroupPolicyTeamRoleType,
        description: 'The role that members of this group policy will have on the team.',
    })
    public roleType?: GroupPolicyTeamRoleType;

    @ApiProperty({
        required: true,
        type: TeamRetrievedDtoOutput,
        description: 'The team associated with the group policy.',
    })
    public team!: TeamRetrievedDtoOutput;
}
