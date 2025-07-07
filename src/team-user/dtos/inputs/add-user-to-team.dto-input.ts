import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional } from 'class-validator';
import { UserTeamRoleType } from '../../enums';

export class AddUserToTeamDtoInput {
    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier of the user who has access to the team.',
    })
    @IsInt()
    @IsNotEmpty()
    public userId!: number;

    @ApiProperty({ required: false, enum: UserTeamRoleType, default: UserTeamRoleType.Member })
    @IsOptional()
    @IsEnum(UserTeamRoleType)
    public roleType?: UserTeamRoleType;
}
