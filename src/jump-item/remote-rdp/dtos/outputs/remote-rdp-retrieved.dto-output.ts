import { ApiProperty } from '@nestjs/swagger';
import { JumpGroupRetrievedDtoOutput } from '../../../../jump-group/dtos/outputs';
import { JumpPolicyRetrievedDtoOutput } from '../../../../jump-policy/dtos/outputs';
import { JumpointRetrievedDtoOutput } from '../../../../jumpoint/dtos/outputs';
import { JumpGroupType, RdpQualityMode, SecureAppType } from '../../enums';
import { RemoteRdp } from '../../models';

export class RemoteRdpRetrievedDtoOutput implements RemoteRdp {
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

    @ApiProperty({ required: false, enum: RdpQualityMode })
    public qualityMode?: RdpQualityMode;

    @ApiProperty({ required: false, type: Boolean })
    public mustStartNewConsoleSession?: boolean;

    @ApiProperty({ required: false, type: Boolean })
    public mustIgnoreUntrustedServerCert?: boolean;

    @ApiProperty({ required: false, type: String })
    public tag?: string;

    @ApiProperty({ required: false, type: String })
    public comments?: string;

    @ApiProperty({ required: false, type: String })
    public rdpUsername?: string;

    @ApiProperty({ required: false, type: String })
    public domain?: string;

    @ApiProperty({ required: false, type: Number, nullable: true })
    public jumpPolicyId?: number | null;

    @ApiProperty({ required: false, type: Boolean })
    public isSessionForensicsEnabled?: boolean;

    @ApiProperty({ required: false, type: Number, nullable: true })
    public sessionPolicyId?: number | null;

    @ApiProperty({ required: false, type: Number, nullable: true })
    public endpointId?: number | null;

    @ApiProperty({ required: false, enum: SecureAppType })
    public secureAppType?: SecureAppType;

    @ApiProperty({ required: false, type: String })
    public remoteAppName?: string;

    @ApiProperty({ required: false, type: String })
    public remoteAppParams?: string;

    @ApiProperty({ required: false, type: String })
    public remoteExePath?: string;

    @ApiProperty({ required: false, type: String })
    public remoteExeParams?: string;

    @ApiProperty({ required: false, type: String })
    public targetSystem?: string;

    @ApiProperty({ required: false, type: String })
    public credentialType?: string;

    @ApiProperty({ required: true, type: Date })
    public lastSyncDate!: Date;

    @ApiProperty({ required: true, type: JumpointRetrievedDtoOutput })
    public jumpoint!: JumpointRetrievedDtoOutput;

    @ApiProperty({ required: true, type: JumpGroupRetrievedDtoOutput })
    public jumpGroup!: JumpGroupRetrievedDtoOutput;

    @ApiProperty({ required: true, type: JumpPolicyRetrievedDtoOutput, nullable: true })
    public jumpPolicy?: JumpPolicyRetrievedDtoOutput | null;
}
