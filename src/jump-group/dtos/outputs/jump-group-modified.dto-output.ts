import { ApiProperty } from '@nestjs/swagger';
import { JumpGroup } from '../../models';

export class JumpGroupModifiedDtoOutput implements JumpGroup {
    @ApiProperty({ required: true, type: Number })
    public id!: number;

    @ApiProperty({ required: true, type: String })
    public name!: string;

    @ApiProperty({ required: false, type: String })
    public codeName?: string;

    @ApiProperty({ required: false, type: String, nullable: true })
    public comments?: string | null;

    @ApiProperty({ required: true, type: Date })
    public lastSyncDate!: Date;
}
