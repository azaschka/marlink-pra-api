import { ApiProperty } from '@nestjs/swagger';
import { JumpGroupType, TunnelType } from '../../enums';
import { ProtocolTunnelJump } from '../../models';

export class ProtocolTunnelJumpCopiedDtoOutput implements ProtocolTunnelJump {
    @ApiProperty({ required: true, type: Number })
    public id!: number;

    @ApiProperty({ required: true, type: String })
    public name!: string;

    @ApiProperty({ required: true, type: Number })
    public jumpointId!: number;

    @ApiProperty({ required: true, type: String })
    public hostname!: string;

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

    @ApiProperty({ required: false, type: String })
    public tunnelListenAddress?: string;

    @ApiProperty({ required: false, type: String })
    public tunnelDefinitions?: string;

    @ApiProperty({ required: false, enum: TunnelType })
    public tunnelType?: TunnelType;

    @ApiProperty({ required: false, type: String })
    public username?: string;

    @ApiProperty({ required: false, type: String })
    public database?: string;

    @ApiProperty({ required: false, type: String })
    public url?: string;

    @ApiProperty({ required: false, type: String })
    public caCertificates?: string;

    @ApiProperty({ required: true, type: Date })
    public lastSyncDate!: Date;
}
