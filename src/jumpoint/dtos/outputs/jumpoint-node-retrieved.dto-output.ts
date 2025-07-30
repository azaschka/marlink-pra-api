import { ApiProperty } from '@nestjs/swagger';
import { JumpointNode } from '../../models';

export class JumpointNodeRetrievedDtoOutput implements JumpointNode {
    @ApiProperty({
        type: Number,
        required: true,
        description: 'The unique identifier assigned to this Jumpoint node by the appliance.',
    })
    public id!: number;

    @ApiProperty({
        type: Number,
        required: true,
        description: 'The unique identifier assigned to this Jumpoint by the appliance.',
    })
    public jumpointId!: number;

    @ApiProperty({
        type: String,
        required: false,
        nullable: true,
        description: 'The last time at which this node connected to the appliance. The time is in UTC.',
    })
    public lastConnectDate?: Date | null;

    @ApiProperty({
        type: String,
        required: false,
        nullable: true,
        description: 'The last time at which this node disconnected from the appliance. The time is in UTC.',
    })
    public lastDisconnectDate?: Date | null;

    @ApiProperty({
        type: String,
        required: true,
        description: 'The public IP address of the system on which the node is running.',
    })
    public publicIp!: string;

    @ApiProperty({
        type: String,
        required: true,
        description: 'The private IP address of the system on which the node is running.',
    })
    public privateIp!: string;

    @ApiProperty({
        type: String,
        required: true,
        description: 'The hostname of the system on which the node is running.',
    })
    public hostname!: string;

    @ApiProperty({
        type: Date,
        required: true,
        description:
            'The date which the jumpoint node was last synchronized with BeyondTrust Privileged Remote Access system.',
    })
    public lastSyncDate!: Date;
}
