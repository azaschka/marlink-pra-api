import { ApiProperty } from '@nestjs/swagger';
import { JumpointPlatformType, JzpClientAddressRestrictionsType } from '../../enums';
import { Jumpoint, JumpointIpRange } from '../../models';
import { JumpointIpRangeDtoOutput } from './jumpoint-ip-range.dto-output';

export class JumpointCreatedDtoOutput implements Jumpoint {
    @ApiProperty({
        type: Number,
        required: true,
        description: 'The unique identifier assigned to this Jumpoint by the appliance. This value must be unique.',
    })
    public id!: number;

    @ApiProperty({
        type: String,
        required: true,
        description: 'The display name of the Jumpoint. This value must be unique.',
    })
    public name!: string;

    @ApiProperty({
        enum: JumpointPlatformType,
        required: true,
        description: 'The platform of the Jumpoint. This attribute cannot be modified after the Jumpoint is created.',
    })
    public platformType!: JumpointPlatformType;

    @ApiProperty({
        type: String,
        required: false,
        description:
            'The code name of a resource. This value must be unique. Only letters, numbers, underscores, and hyphens are allowed.',
    })
    public codeName?: string;

    @ApiProperty({
        type: String,
        required: false,
        description: "The Jumpoint's comments.",
    })
    public comments?: string;

    @ApiProperty({
        type: Boolean,
        required: false,
        description: 'If true, the Jumpoint is enabled.',
    })
    public isEnabled?: boolean;

    @ApiProperty({
        type: Boolean,
        required: false,
        description: 'If true, the Jumpoint is connected to the appliance.',
    })
    public isConnected?: boolean;

    @ApiProperty({
        type: Boolean,
        required: false,
        description:
            'If true, the Jumpoint can have more than one node. This attribute cannot be modified after the Jumpoint is created.',
    })
    public isClustered?: boolean;

    @ApiProperty({
        type: Boolean,
        required: false,
        description: 'If true, users are allowed to start Shell Jump sessions with the Jumpoint.',
    })
    public isShellJumpEnabled?: boolean;

    @ApiProperty({
        type: String,
        required: false,
        description:
            'This field is only applicable when the search for external jump items is allowed. The value must be unique if it is not empty.',
    })
    public externalJumpItemNetworkId?: string;

    @ApiProperty({
        type: Boolean,
        required: false,
        description: 'If true, users are allowed to start Protocol Tunnel sessions with the Jumpoint.',
    })
    public isProtocolTunnelEnabled?: boolean;

    @ApiProperty({
        type: Number,
        required: false,
        nullable: true,
        description:
            'The unique identifier of the Vault account through which RDP sessions can also receive additional audit capabilities. It must be a generic account or a domain account.',
    })
    public rdpServiceAccountId?: number | null;

    @ApiProperty({
        type: [JumpointIpRangeDtoOutput],
        required: false,
        description:
            'An array of dotted-decimal IPv4 address ranges that should be managed by the network tunnel service on this Jumpoint. If the Network Tunnel feature will be used on one or more networks which do not provide a DHCP service, provide ranges from which allocations can be made for access sessions. An IP address for each network that the filter rules of a Protocol Tunnel Jump Shortcut allows will be allocated to a user while participating in a session. Take care to provide ranges that do not contain IP addresses which could be used by other systems on that network.',
    })
    public managedIpRanges?: JumpointIpRange[];

    @ApiProperty({
        type: Boolean,
        required: false,
        description:
            'Indicates whether the Jump Zone Proxy feature is enabled. This value can be null in responses for Jumpoints created before an upgrade until the Jumpoint connects for the first time after the upgrade.',
    })
    public isJzpEnabled?: boolean;

    @ApiProperty({
        type: String,
        required: false,
        description:
            'The hostname of the Jump Zone Proxy server. This parameter is only used for standalone Jumpoints and is only valid if the Jump Zone Proxy is enabled. This value can be null in responses for Jumpoints created before an upgrade until the Jumpoint connects for the first time after the upgrade.',
    })
    public jzpProxyHostname?: string;

    @ApiProperty({
        type: Number,
        required: false,
        description:
            'TCP Port of the Jump Zone Proxy. Only valid when the Jump Zone Proxy is enabled. This value can be null in responses for Jumpoints created before an upgrade until the Jumpoint connects for the first time after the upgrade.',
    })
    public jzpProxyPort?: number;

    @ApiProperty({
        type: Boolean,
        required: false,
        description:
            'If enabled, HTTP GET requests are permitted through the proxy to the BeyondTrust appliance, and this setting is only applicable if the Jump Zone Proxy is enabled. This value can be null in responses for Jumpoints created before an upgrade until the Jumpoint connects for the first time after the upgrade.',
    })
    public isJzpHttpGetAllowed?: boolean;

    @ApiProperty({
        enum: JzpClientAddressRestrictionsType,
        required: false,
        description:
            'The type of client address restrictions to apply to the JZP. If set to no-restriction, the jzpRestrictedIps field is ignored. If set to allow-all, the jzpRestrictedIps field is used to specify a list of allowed network address prefixes. If set to deny-all, the jzpRestrictedIps field is used to specify a list of denied network address prefixes.',
    })
    public jzpClientAddressRestrictionsType?: JzpClientAddressRestrictionsType;

    @ApiProperty({
        type: [String],
        required: false,
        description:
            'Array of network address prefixes, where netmasks are optional and can be specified in either dotted-decimal or integer bitmask format. If a netmask is omitted, the entry is assumed to be a single IP address. This field is only valid if the jzpClientAddressRestrictionsType is set to allow-all or deny-all.',
    })
    public jzpRestrictedIps?: string[];

    @ApiProperty({
        type: String,
        required: false,
        description:
            'The value to provide to the Jumpoint Docker image as the DEPLOY_KEY environment variable. This value will only be set for Linux Jumpoints that have clustered set to true.',
    })
    public dockerDeployKey?: string;

    @ApiProperty({
        type: String,
        required: false,
        description: 'The key info of the Jumpoint Installer.',
    })
    public keyInfo?: string;

    @ApiProperty({
        type: Date,
        required: true,
        description:
            'The date which the jumpoint was last synchronized with BeyondTrust Privileged Remote Access system.',
    })
    public lastSyncDate!: Date;
}
