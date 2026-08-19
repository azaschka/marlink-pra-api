import { JumpClient } from '../../jump-client/models';
import { ProtocolTunnelJump } from '../../jump-item/protocol-tunnel-jump/models';
import { RemoteRdp } from '../../jump-item/remote-rdp/models';
import { RemoteVnc } from '../../jump-item/remote-vnc/models';
import { ShellJump } from '../../jump-item/shell-jump/models';
import { WebJump } from '../../jump-item/web-jump/models';
import { SocJumpItemType } from '../enums';

export interface SocJumpItem {
    jumpItemType: SocJumpItemType;
    jumpItem: ProtocolTunnelJump | RemoteRdp | RemoteVnc | ShellJump | WebJump | JumpClient;
    customerKey?: string;
    customerName?: string;
    siteKey?: string;
    siteName?: string;
}
