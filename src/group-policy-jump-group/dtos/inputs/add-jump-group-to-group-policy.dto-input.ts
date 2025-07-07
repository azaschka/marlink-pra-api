import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional } from 'class-validator';

export class AddJumpGroupToGroupPolicyDtoInput {
    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier assigned to a Jump Group.',
    })
    @IsInt()
    @IsNotEmpty()
    public jumpGroupId!: number;

    @ApiProperty({
        required: false,
        type: Number,
        description: `The unique identifier assigned to a Jump Item Role or 0 meaning "User's Default".`,
    })
    @IsInt()
    @IsOptional()
    public jumpItemRoleId?: number;

    @ApiProperty({
        required: false,
        type: Number,
        description: `The unique identifier assigned to a Jump Policy or 0 meaning "Set on Jump Items".`,
    })
    @IsInt()
    @IsOptional()
    public jumpPolicyId?: number;
}
