import { ApiProperty } from '@nestjs/swagger';
import { JumpGroupType, ShellJumpProtocolType, ShellJumpTerminalType } from '../../enums';
import { ShellJump } from '../../models';

export class ShellJumpCreatedDtoOutput implements ShellJump {
    @ApiProperty({ required: true, type: Number })
    public id!: number;

    @ApiProperty({ required: true, type: String })
    public name!: string;

    @ApiProperty({ required: true, type: Number })
    public jumpointId!: number;

    @ApiProperty({ required: true, type: String })
    public hostname!: string;

    @ApiProperty({ required: true, enum: ShellJumpProtocolType })
    public protocolType!: ShellJumpProtocolType;

    @ApiProperty({ required: false, type: Number })
    public port?: number;

    @ApiProperty({ required: true, type: Number })
    public jumpGroupId!: number;

    @ApiProperty({ required: false, enum: JumpGroupType })
    public jumpGroupType?: JumpGroupType;

    @ApiProperty({ required: false, enum: ShellJumpTerminalType })
    public terminalType?: ShellJumpTerminalType;

    @ApiProperty({ required: false, type: Number })
    public keepAliveIdleSessionInSeconds?: number;

    @ApiProperty({ required: false, type: String })
    public tag?: string;

    @ApiProperty({ required: false, type: String })
    public comments?: string;

    @ApiProperty({ required: false, type: Number, nullable: true })
    public jumpPolicyId?: number | null;

    @ApiProperty({ required: false, type: String })
    public username?: string;

    @ApiProperty({ required: false, type: Number, nullable: true })
    public sessionPolicyId?: number | null;

    @ApiProperty({ required: true, type: Date })
    public lastSyncDate!: Date;
}
