import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { JumpClientRetrievedDtoOutput } from '../../../jump-client/dtos/outputs';
import { JumpClient } from '../../../jump-client/models';
import { ProtocolTunnelJumpRetrievedDtoOutput } from '../../../jump-item/protocol-tunnel-jump/dtos/outputs';
import { ProtocolTunnelJump } from '../../../jump-item/protocol-tunnel-jump/models';
import { RemoteRdpRetrievedDtoOutput } from '../../../jump-item/remote-rdp/dtos/outputs';
import { RemoteRdp } from '../../../jump-item/remote-rdp/models';
import { RemoteVncRetrievedDtoOutput } from '../../../jump-item/remote-vnc/dtos/outputs';
import { RemoteVnc } from '../../../jump-item/remote-vnc/models';
import { ShellJumpRetrievedDtoOutput } from '../../../jump-item/shell-jump/dtos/outputs';
import { ShellJump } from '../../../jump-item/shell-jump/models';
import { WebJumpRetrievedDtoOutput } from '../../../jump-item/web-jump/dtos/outputs';
import { WebJump } from '../../../jump-item/web-jump/models';
import { SocCustomerSiteMappingStatus, SocJumpItemType } from '../../enums';
import { SocJumpItem } from '../../models';

export class SocJumpItemRetrievedDtoOutput implements SocJumpItem {
    @ApiProperty({
        required: true,
        enum: SocJumpItemType,
    })
    public jumpItemType!: SocJumpItemType;

    @ApiProperty({
        required: true,
        oneOf: [
            { $ref: getSchemaPath(ProtocolTunnelJumpRetrievedDtoOutput) },
            { $ref: getSchemaPath(RemoteRdpRetrievedDtoOutput) },
            { $ref: getSchemaPath(RemoteVncRetrievedDtoOutput) },
            { $ref: getSchemaPath(ShellJumpRetrievedDtoOutput) },
            { $ref: getSchemaPath(WebJumpRetrievedDtoOutput) },
            { $ref: getSchemaPath(JumpClientRetrievedDtoOutput) },
        ],
    })
    public jumpItem!: ProtocolTunnelJump | RemoteRdp | RemoteVnc | ShellJump | WebJump | JumpClient;

    @ApiProperty({
        required: false,
    })
    public customerKey?: string;

    @ApiProperty({
        required: false,
    })
    public customerName?: string;

    @ApiProperty({
        required: false,
    })
    public siteKey?: string;

    @ApiProperty({
        required: false,
    })
    public siteName?: string;

    @ApiProperty({
        required: true,
        enum: SocCustomerSiteMappingStatus,
        description:
            'States how far this jump item could be attributed to a customer/site. ' +
            '"unmapped" identifies a remote access path without an identifiable owner.',
    })
    public mappingStatus!: SocCustomerSiteMappingStatus;
}
