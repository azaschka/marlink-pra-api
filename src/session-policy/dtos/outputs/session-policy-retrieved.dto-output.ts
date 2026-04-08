import { ApiProperty } from '@nestjs/swagger';
import { SessionPolicy } from '../../models';

export class SessionPolicyRetrievedDtoOutput implements SessionPolicy {
    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier assigned to this session policy by the appliance.',
    })
    public id!: number;

    @ApiProperty({ required: true, type: String, description: 'The display name of the session policy.' })
    public displayName!: string;

    @ApiProperty({
        required: false,
        type: String,
        description: 'The code name of the session policy. This value must be unique.',
    })
    public codeName!: string;

    @ApiProperty({ required: false, type: String, nullable: true, description: 'The session policy description.' })
    public description!: string;

    @ApiProperty({
        required: true,
        type: Date,
        description:
            'The date which the session policy was last synchronized with BeyondTrust Privileged Remote Access system.',
    })
    public lastSyncDate!: Date;
}
