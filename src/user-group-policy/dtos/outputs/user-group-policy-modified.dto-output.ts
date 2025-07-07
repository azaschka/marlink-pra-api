import { ApiProperty } from '@nestjs/swagger';
import { UserGroupPolicy } from '../../models';

export class UserGroupPolicyModifiedDtoOutput implements UserGroupPolicy {
    @ApiProperty({ required: true, type: Number, description: 'The unique identifier for the user.' })
    public userId!: number;

    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier for the group policy.',
    })
    public groupPolicyId!: number;
}
