import { JumpClient } from '../../jump-client/models';
import { ProtocolTunnelJump } from '../../jump-item/protocol-tunnel-jump/models';
import { RemoteRdp } from '../../jump-item/remote-rdp/models';
import { RemoteVnc } from '../../jump-item/remote-vnc/models';
import { ShellJump } from '../../jump-item/shell-jump/models';
import { WebJump } from '../../jump-item/web-jump/models';
import { SocJumpItemType } from '../enums';
import { SocCustomerSiteMapping } from './soc-customer-site-mapping.model';

/** A jump item that is bound to a jumpoint, as opposed to a jump client. */
export type JumpointBoundJumpItem = ProtocolTunnelJump | RemoteRdp | RemoteVnc | ShellJump | WebJump;

export interface SocJumpItem extends SocCustomerSiteMapping {
    jumpItemType: SocJumpItemType;
    jumpItem: JumpointBoundJumpItem | JumpClient;
}
