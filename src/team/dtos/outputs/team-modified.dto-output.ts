import { ApiProperty } from '@nestjs/swagger';
import { Team } from '../../models';

export class TeamModifiedDtoOutput implements Team {
    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier assigned to this team by the appliance.',
    })
    public id!: number;

    @ApiProperty({ required: true, type: String, description: 'The display name of the team.' })
    public name!: string;

    @ApiProperty({
        required: false,
        type: String,
        description: 'The code name of a resource. This value must be unique.',
    })
    public codeName?: string;

    @ApiProperty({ required: false, type: String, nullable: true, description: 'The team comments.' })
    public comments?: string | null;

    @ApiProperty({
        required: true,
        type: Date,
        description: 'The date which the user was last synchronized with BeyondTrust Privileged Remote Access system.',
    })
    public lastSyncDate!: Date;
}
