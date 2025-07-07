import { ApiProperty } from '@nestjs/swagger';
import { JumpGroupType, WebJumpUsernameFormatType } from '../../enums';
import { WebJump } from '../../models';

export class WebJumpRetrievedDtoOutput implements WebJump {
    @ApiProperty({ required: true, type: Number })
    public id!: number;

    @ApiProperty({ required: true, type: String })
    public name!: string;

    @ApiProperty({ required: true, type: Number })
    public jumpointId!: number;

    @ApiProperty({ required: true, type: String })
    public url!: string;

    @ApiProperty({ required: true, type: Number })
    public jumpGroupId!: number;

    @ApiProperty({ required: false, enum: JumpGroupType })
    public jumpGroupType?: JumpGroupType;

    @ApiProperty({ required: false, enum: WebJumpUsernameFormatType })
    public usernameFormatType?: WebJumpUsernameFormatType;

    @ApiProperty({ required: false, type: Boolean })
    public mustVerifyCertificate?: boolean;

    @ApiProperty({ required: false, type: Number })
    public authenticationTimeoutInSeconds?: number;

    @ApiProperty({ required: false, type: String })
    public tag?: string;

    @ApiProperty({ required: false, type: String })
    public comments?: string;

    @ApiProperty({ required: false, type: Number, nullable: true })
    public jumpPolicyId?: number | null;

    @ApiProperty({ required: false, type: String, nullable: true })
    public usernameField?: string | null;

    @ApiProperty({ required: false, type: String, nullable: true })
    public passwordField?: string | null;

    @ApiProperty({ required: false, type: String, nullable: true })
    public submitField?: string | null;

    @ApiProperty({ required: false, type: Number, nullable: true })
    public sessionPolicyId?: number | null;

    @ApiProperty({ required: true, type: Date })
    public lastSyncDate!: Date;
}
