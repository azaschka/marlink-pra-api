import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional } from 'class-validator';
import { GroupPolicyTeamRoleType } from '../../enums';

export class AddTeamToGroupPolicyDtoInput {
    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier assigned to a team.',
    })
    @IsInt()
    @IsNotEmpty()
    public teamId!: number;

    @ApiProperty({
        required: false,
        enum: GroupPolicyTeamRoleType,
        description: 'The role that members of this group policy will have on the team.',
        default: GroupPolicyTeamRoleType.Member,
    })
    @IsOptional()
    @IsEnum(GroupPolicyTeamRoleType)
    public roleType?: GroupPolicyTeamRoleType;
}
