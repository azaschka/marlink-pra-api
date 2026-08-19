import { Customer } from '../../customer/models';
import { Jumpoint } from '../../jumpoint/models';
import { Site } from '../../site/models';
import { SocJumpItemType } from '../enums';
import { SocJumpItem } from '../models';

export abstract class SocJumpItemUtility {
    public static mapJumpointJumpItemsToSocJumpItems(
        jumpoints: Jumpoint[],
        customer: Customer | undefined,
        site: Site | undefined,
    ): SocJumpItem[] {
        const socJumpItems: SocJumpItem[] = [];

        for (const jumpoint of jumpoints) {
            if (jumpoint.protocolTunnelJumps && jumpoint.protocolTunnelJumps.length > 0) {
                for (const protocolTunnelJump of jumpoint.protocolTunnelJumps) {
                    socJumpItems.push({
                        jumpItemType: SocJumpItemType.ProtocolTunnelJump,
                        jumpItem: protocolTunnelJump,
                        customerKey: customer?.key,
                        customerName: customer?.name,
                        siteKey: site?.key,
                        siteName: site?.name,
                    });
                }
            }

            if (jumpoint.remoteRdps && jumpoint.remoteRdps.length > 0) {
                for (const remoteRdp of jumpoint.remoteRdps) {
                    socJumpItems.push({
                        jumpItemType: SocJumpItemType.RemoteRdp,
                        jumpItem: remoteRdp,
                        customerKey: customer?.key,
                        customerName: customer?.name,
                        siteKey: site?.key,
                        siteName: site?.name,
                    });
                }
            }

            if (jumpoint.remoteVncs && jumpoint.remoteVncs.length > 0) {
                for (const remoteVnc of jumpoint.remoteVncs) {
                    socJumpItems.push({
                        jumpItemType: SocJumpItemType.RemoteVnc,
                        jumpItem: remoteVnc,
                        customerKey: customer?.key,
                        customerName: customer?.name,
                        siteKey: site?.key,
                        siteName: site?.name,
                    });
                }
            }

            if (jumpoint.shellJumps && jumpoint.shellJumps.length > 0) {
                for (const shellJump of jumpoint.shellJumps) {
                    socJumpItems.push({
                        jumpItemType: SocJumpItemType.ShellJump,
                        jumpItem: shellJump,
                        customerKey: customer?.key,
                        customerName: customer?.name,
                        siteKey: site?.key,
                        siteName: site?.name,
                    });
                }
            }

            if (jumpoint.webJumps && jumpoint.webJumps.length > 0) {
                for (const webJump of jumpoint.webJumps) {
                    socJumpItems.push({
                        jumpItemType: SocJumpItemType.WebJump,
                        jumpItem: webJump,
                        customerKey: customer?.key,
                        customerName: customer?.name,
                        siteKey: site?.key,
                        siteName: site?.name,
                    });
                }
            }
        }

        return socJumpItems;
    }
}
