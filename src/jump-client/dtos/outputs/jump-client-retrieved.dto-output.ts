import { ApiProperty } from '@nestjs/swagger';
import { JumpGroupRetrievedDtoOutput } from '../../../jump-group/dtos/outputs';
import { JumpPolicyRetrievedDtoOutput } from '../../../jump-policy/dtos/outputs';
import {
    JumpClientConnectionType,
    JumpClientEndpointAgreementPolicyType,
    JumpClientGroupType,
    JumpClientInstallMode,
    JumpClientUnavailableReasonType,
} from '../../enums';
import { JumpClient } from '../../models';

export class JumpClientRetrievedDtoOutput implements JumpClient {
    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier assigned to this Jump Client by the appliance.',
    })
    public id!: number;

    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier of the shared Jump Group or user that owns this Jump Client.',
    })
    public jumpGroupId!: number;

    @ApiProperty({
        required: false,
        enum: JumpClientGroupType,
        description: 'The type of Jump Group that owns this Jump Client.',
    })
    public jumpGroupType?: JumpClientGroupType;

    @ApiProperty({ required: false, type: String, description: "The Jump Client's user-friendly name." })
    public name?: string;

    @ApiProperty({ required: false, type: String, description: "The Jump Client's hostname (computer name)." })
    public hostname?: string;

    @ApiProperty({
        required: false,
        type: String,
        description: "The Jump Client's fully qualified domain name. This attribute is not available on all systems.",
    })
    public fqdn?: string;

    @ApiProperty({ required: false, type: String, description: "The Jump Client's tag." })
    public tag?: string;

    @ApiProperty({ required: false, type: String, description: "The Jump Client's comments." })
    public comments?: string;

    @ApiProperty({
        required: false,
        type: Number,
        nullable: true,
        description: 'The unique identifier of the Jump Policy used to manage access to this Jump Item.',
    })
    public jumpPolicyId?: number | null;

    @ApiProperty({
        required: false,
        type: Number,
        nullable: true,
        description: 'The session policy used on the Jump Client system.',
    })
    public sessionPolicyId?: number | null;

    @ApiProperty({
        required: false,
        enum: JumpClientInstallMode,
        description:
            'The mode in which the Jump Client service was installed on the endpoint. Service mode means the Jump Client is running in an elevated security context.',
    })
    public installMode?: JumpClientInstallMode;

    @ApiProperty({
        required: false,
        enum: JumpClientConnectionType,
        description:
            'The type of connection maintained between the appliance and the Jump Client. Cloud deployments only allow active Jump Clients.',
    })
    public connectionType?: JumpClientConnectionType;

    @ApiProperty({
        required: false,
        type: Date,
        description: 'The last time at which the Jump Client connected to the appliance.',
    })
    public lastConnectDate?: Date;

    @ApiProperty({
        required: false,
        type: Date,
        description:
            'The last time at which the Jump Client disconnected from the appliance. If empty then the Jump Client has never disconnected.',
    })
    public lastDisconnectDate?: Date;

    @ApiProperty({
        required: false,
        type: Boolean,
        description:
            "For active Jump Clients, this is true when the Jump Client has been disconnected for longer than the number of days configured for the 'lost' setting in the jump clients. For passive Jump Clients, this is true when the Jump Client has not checked in for longer than the number of days configured for the 'lost' setting in the jump clients.",
    })
    public isLost?: boolean;

    @ApiProperty({
        required: false,
        type: Boolean,
        description:
            'If true, this Jump Client is running an older version of the software and needs to be updated. Sessions cannot be started with this Jump Client until it is upgraded to the latest version.',
    })
    public needsUpdate?: boolean;

    @ApiProperty({
        required: false,
        enum: JumpClientUnavailableReasonType,
        description:
            'The reason why the Jump Client cannot be used to start sessions. Disabled indicates the end user disabled the Jump Client on their system.',
    })
    public unavailableReasonType?: JumpClientUnavailableReasonType;

    @ApiProperty({
        required: false,
        type: String,
        description: 'The name, version, and platform of the operating system on which the Jump Client is running.',
    })
    public operatingSystem?: string;

    @ApiProperty({
        required: false,
        type: String,
        description: 'The public IP address of the system on which the Jump Client is running.',
    })
    public publicIp?: string;

    @ApiProperty({
        required: false,
        type: String,
        description: 'The private IP address of the system on which the Jump Client is running.',
    })
    public privateIp?: string;

    @ApiProperty({
        required: false,
        type: String,
        description: 'The username of the user is logged on to the system on which the Jump Client is running.',
    })
    public consoleUser?: string;

    @ApiProperty({
        required: false,
        type: Date,
        description: 'The date/time at which the Jump Client will automatically uninstall itself.',
    })
    public expirationDate?: Date;

    @ApiProperty({
        required: false,
        type: Number,
        description:
            'The maximum number of minutes the Jump Client can be offline before being uninstalled. If 0, this Jump Client follows the global lost client settings.',
    })
    public maxOfflineDurationInMinutes?: number;

    @ApiProperty({
        required: false,
        type: Date,
        description: 'The last time at which this Jump Client was used to start a session.',
    })
    public lastAccessDate?: Date;

    @ApiProperty({
        required: false,
        enum: JumpClientEndpointAgreementPolicyType,
        description:
            'The value accept will automatically accept the endpoint agreement if it times out and allow the session to start. The value reject will automatically reject the endpoint agreement and stop the session from starting. The value no-prompt will not show an endpoint agreement even if the feature is configured. This field has no effect if the global endpoint agreement setting is not enabled. This field is only available for GET and PATCH requests.',
    })
    public endpointAgreementPolicyType?: JumpClientEndpointAgreementPolicyType;

    @ApiProperty({ required: false, type: String, nullable: true, description: 'The name of the Jumpoint proxy.' })
    public jumpointProxy?: string | null;

    @ApiProperty({
        required: true,
        type: Date,
        description: 'The date which the user was last synchronized with BeyondTrust Privileged Remote Access system.',
    })
    public lastSyncDate!: Date;

    @ApiProperty({ required: true, type: JumpGroupRetrievedDtoOutput })
    public jumpGroup!: JumpGroupRetrievedDtoOutput;

    @ApiProperty({ required: true, type: JumpPolicyRetrievedDtoOutput, nullable: true })
    public jumpPolicy?: JumpPolicyRetrievedDtoOutput | null;
}
