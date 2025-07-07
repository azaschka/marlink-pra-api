import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty } from 'class-validator';

export class AddJumpointToGroupPolicyDtoInput {
    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier assigned to the Jumpoint by the system.',
    })
    @IsInt()
    @IsNotEmpty()
    public jumpointId!: number;
}
