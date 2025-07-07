import { ApiProperty } from '@nestjs/swagger';
import { JumpointRetrievedDtoOutput } from '../../../jumpoint/dtos/outputs';
import { GroupPolicyJumpoint } from '../../models';

export class GroupPolicyJumpointRetrievedDtoOutput implements GroupPolicyJumpoint {
    @ApiProperty({ required: true, type: Number, description: 'The unique identifier of the group policy.' })
    public groupPolicyId!: number;

    @ApiProperty({ required: true, type: Number, description: 'The unique identifier of the jumpoint.' })
    public jumpointId!: number;

    @ApiProperty({
        required: true,
        type: JumpointRetrievedDtoOutput,
        description: 'The jumpoint associated with the group policy.',
    })
    public jumpoint!: JumpointRetrievedDtoOutput;
}
