import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsNotEmpty } from 'class-validator';

export class ModifyUserGroupPoliciesDtoInput {
    @ApiProperty({
        required: true,
        type: [Number],
        description: 'Array with the unique identifiers of the group policies to add the user to.',
    })
    @IsArray()
    @IsInt({ each: true })
    @IsNotEmpty()
    public groupPolicyIdsToAdd!: number[];

    @ApiProperty({
        required: true,
        type: [Number],
        description: 'The unique identifier of the group policy to remove the user from.',
    })
    @IsArray()
    @IsInt({ each: true })
    @IsNotEmpty()
    public groupPolicyIdsToRemove!: number[];
}
