import { ApiProperty } from '@nestjs/swagger';
import { JumpGroupType } from '../../enums';
import { RemoteVnc } from '../../models';

export class RemoteVncCopiedDtoOutput implements RemoteVnc {
    @ApiProperty({ required: true, type: Number })
    public id!: number;

    @ApiProperty({ required: true, type: String })
    public name!: string;

    @ApiProperty({ required: true, type: Number })
    public jumpointId!: number;

    @ApiProperty({ required: true, type: String })
    public hostname!: string;

    @ApiProperty({ required: false, type: Number, nullable: true })
    public port?: number;

    @ApiProperty({ required: true, type: Number })
    public jumpGroupId!: number;

    @ApiProperty({ required: false, enum: JumpGroupType })
    public jumpGroupType?: JumpGroupType;

    @ApiProperty({ required: false, type: String })
    public tag?: string;

    @ApiProperty({ required: false, type: String })
    public comments?: string;

    @ApiProperty({ required: false, type: Number, nullable: true })
    public jumpPolicyId?: number | null;

    @ApiProperty({ required: false, type: Number, nullable: true })
    public sessionPolicyId?: number | null;

    @ApiProperty({ required: true, type: Date })
    public lastSyncDate!: Date;
}
