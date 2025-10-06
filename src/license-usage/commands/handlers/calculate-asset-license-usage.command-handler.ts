import { CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { Customer } from '../../../customer/models';
import { GroupPolicyJumpGroup } from '../../../group-policy-jump-group/models';
import { RetrieveGroupPolicyJumpGroupsQuery } from '../../../group-policy-jump-group/queries';
import { GroupPolicy } from '../../../group-policy/models';
import { RetrieveGroupPoliciesQuery } from '../../../group-policy/queries';
import { JumpClient } from '../../../jump-client/models';
import { RetrieveJumpClientsQuery } from '../../../jump-client/queries';
import { JumpGroup } from '../../../jump-group/models';
import { ProtocolTunnelJump } from '../../../jump-item/protocol-tunnel-jump/models';
import { RetrieveProtocolTunnelJumpsQuery } from '../../../jump-item/protocol-tunnel-jump/queries';
import { RemoteRdp } from '../../../jump-item/remote-rdp/models';
import { RetrieveRemoteRdpsQuery } from '../../../jump-item/remote-rdp/queries';
import { RemoteVnc } from '../../../jump-item/remote-vnc/models';
import { RetrieveRemoteVncsQuery } from '../../../jump-item/remote-vnc/queries';
import { ShellJump } from '../../../jump-item/shell-jump/models';
import { RetrieveShellJumpsQuery } from '../../../jump-item/shell-jump/queries';
import { WebJump } from '../../../jump-item/web-jump/models';
import { RetrieveWebJumpsQuery } from '../../../jump-item/web-jump/queries';
import { PaginationUtility } from '../../../shared/utilities';
import { Site } from '../../../site/models';
import { JumpItemType } from '../../enums';
import { AssetLicenseUsageSourceData, LicenseUsage } from '../../models';
import { CalculateAssetLicenseUsageCommand } from '../calculate-asset-license-usage.command';

@CommandHandler(CalculateAssetLicenseUsageCommand)
export class CalculateAssetLicenseUsageCommandHandler implements ICommandHandler<CalculateAssetLicenseUsageCommand> {
    private static readonly MAX_PAGE_RETRIEVAL_SIZE = 100;

    constructor(private readonly queryBus: QueryBus) {}

    public async execute(command: CalculateAssetLicenseUsageCommand): Promise<LicenseUsage> {
        const { totalLicenseUsage, licenseUsageSourceData } = await this.calculateCustomerAndSiteUsage(
            command.transactionId,
            command.customer,
            command.site,
        );

        return {
            totalLicenseUsage: totalLicenseUsage,
            licenseUsageSourceData: licenseUsageSourceData,
        };
    }

    private async calculateCustomerAndSiteUsage(transactionId: string, customer: Customer, site?: Site) {
        const licenseUsageSourceData: AssetLicenseUsageSourceData[] = [];

        const associatedGroupPolicies = await this.getCustomerAssociatedGroupPolicies(transactionId, customer);

        for (const associatedGroupPolicy of associatedGroupPolicies) {
            const allAssociatedGroupPolicyJumpGroups = await PaginationUtility.queryUntilLastPage<GroupPolicyJumpGroup>(
                (pageNumber: number) =>
                    this.queryBus.execute<RetrieveGroupPolicyJumpGroupsQuery, GroupPolicyJumpGroup[]>(
                        new RetrieveGroupPolicyJumpGroupsQuery(
                            transactionId,
                            customer.beyondtrustInstanceId,
                            CalculateAssetLicenseUsageCommandHandler.MAX_PAGE_RETRIEVAL_SIZE,
                            pageNumber,
                            associatedGroupPolicy.id,
                        ),
                    ),
            );

            for (const associatedGroupPolicyJumpGroup of allAssociatedGroupPolicyJumpGroups) {
                let remoteRdps = await PaginationUtility.queryUntilLastPage<RemoteRdp>((pageNumber: number) =>
                    this.queryBus.execute<RetrieveRemoteRdpsQuery, RemoteRdp[]>(
                        new RetrieveRemoteRdpsQuery(
                            transactionId,
                            customer.beyondtrustInstanceId,
                            CalculateAssetLicenseUsageCommandHandler.MAX_PAGE_RETRIEVAL_SIZE,
                            pageNumber,
                            undefined,
                            undefined,
                            associatedGroupPolicyJumpGroup.jumpGroupId,
                        ),
                    ),
                );

                let remoteVncs = await PaginationUtility.queryUntilLastPage<RemoteVnc>((pageNumber: number) =>
                    this.queryBus.execute<RetrieveRemoteVncsQuery, RemoteVnc[]>(
                        new RetrieveRemoteVncsQuery(
                            transactionId,
                            customer.beyondtrustInstanceId,
                            CalculateAssetLicenseUsageCommandHandler.MAX_PAGE_RETRIEVAL_SIZE,
                            pageNumber,
                            undefined,
                            undefined,
                            associatedGroupPolicyJumpGroup.jumpGroupId,
                        ),
                    ),
                );

                let shellJumps = await PaginationUtility.queryUntilLastPage<ShellJump>((pageNumber: number) =>
                    this.queryBus.execute<RetrieveShellJumpsQuery, ShellJump[]>(
                        new RetrieveShellJumpsQuery(
                            transactionId,
                            customer.beyondtrustInstanceId,
                            CalculateAssetLicenseUsageCommandHandler.MAX_PAGE_RETRIEVAL_SIZE,
                            pageNumber,
                            undefined,
                            undefined,
                            associatedGroupPolicyJumpGroup.jumpGroupId,
                        ),
                    ),
                );

                let protocolTunnelJumps = await PaginationUtility.queryUntilLastPage<ProtocolTunnelJump>(
                    (pageNumber: number) =>
                        this.queryBus.execute<RetrieveProtocolTunnelJumpsQuery, ProtocolTunnelJump[]>(
                            new RetrieveProtocolTunnelJumpsQuery(
                                transactionId,
                                customer.beyondtrustInstanceId,
                                CalculateAssetLicenseUsageCommandHandler.MAX_PAGE_RETRIEVAL_SIZE,
                                pageNumber,
                                undefined,
                                undefined,
                                associatedGroupPolicyJumpGroup.jumpGroupId,
                            ),
                        ),
                );

                let webJumps = await PaginationUtility.queryUntilLastPage<WebJump>((pageNumber: number) =>
                    this.queryBus.execute<RetrieveWebJumpsQuery, WebJump[]>(
                        new RetrieveWebJumpsQuery(
                            transactionId,
                            customer.beyondtrustInstanceId,
                            CalculateAssetLicenseUsageCommandHandler.MAX_PAGE_RETRIEVAL_SIZE,
                            pageNumber,
                            undefined,
                            undefined,
                            associatedGroupPolicyJumpGroup.jumpGroupId,
                        ),
                    ),
                );

                let jumpClients = await PaginationUtility.queryUntilLastPage<JumpClient>((pageNumber: number) =>
                    this.queryBus.execute<RetrieveJumpClientsQuery, JumpClient[]>(
                        new RetrieveJumpClientsQuery(
                            transactionId,
                            customer.beyondtrustInstanceId,
                            CalculateAssetLicenseUsageCommandHandler.MAX_PAGE_RETRIEVAL_SIZE,
                            pageNumber,
                            undefined,
                            undefined,
                            undefined,
                            undefined,
                            associatedGroupPolicyJumpGroup.jumpGroupId,
                        ),
                    ),
                );

                if (site) {
                    remoteRdps = remoteRdps.filter((remoteRdp) =>
                        remoteRdp.tag?.toLowerCase().includes(`${site.name}_${site.key}`.toLowerCase()),
                    );
                    remoteVncs = remoteVncs.filter((remoteVnc) =>
                        remoteVnc.tag?.toLowerCase().includes(`${site.name}_${site.key}`.toLowerCase()),
                    );
                    shellJumps = shellJumps.filter((shellJump) =>
                        shellJump.tag?.toLowerCase().includes(`${site.name}_${site.key}`.toLowerCase()),
                    );
                    protocolTunnelJumps = protocolTunnelJumps.filter((protocolTunnelJump) =>
                        protocolTunnelJump.tag?.toLowerCase().includes(`${site.name}_${site.key}`.toLowerCase()),
                    );
                    webJumps = webJumps.filter((webJump) =>
                        webJump.tag?.toLowerCase().includes(`${site.name}_${site.key}`.toLowerCase()),
                    );
                    jumpClients = jumpClients.filter((jumpClient) =>
                        jumpClient.tag?.toLowerCase().includes(`${site.name}_${site.key}`.toLowerCase()),
                    );
                }

                remoteRdps.forEach((remoteRdp) => {
                    licenseUsageSourceData.push(
                        this.generateAssetLicenseUsageSourceData(
                            JumpItemType.RemoteRdp,
                            remoteRdp,
                            associatedGroupPolicy,
                            associatedGroupPolicyJumpGroup,
                        ),
                    );
                });

                remoteVncs.forEach((remoteVnc) => {
                    licenseUsageSourceData.push(
                        this.generateAssetLicenseUsageSourceData(
                            JumpItemType.RemoteVnc,
                            remoteVnc,
                            associatedGroupPolicy,
                            associatedGroupPolicyJumpGroup,
                        ),
                    );
                });

                shellJumps.forEach((shellJump) => {
                    licenseUsageSourceData.push(
                        this.generateAssetLicenseUsageSourceData(
                            JumpItemType.ShellJump,
                            shellJump,
                            associatedGroupPolicy,
                            associatedGroupPolicyJumpGroup,
                        ),
                    );
                });

                protocolTunnelJumps.forEach((protocolTunnelJump) => {
                    licenseUsageSourceData.push(
                        this.generateAssetLicenseUsageSourceData(
                            JumpItemType.ProtocolTunnelJump,
                            protocolTunnelJump,
                            associatedGroupPolicy,
                            associatedGroupPolicyJumpGroup,
                        ),
                    );
                });

                webJumps.forEach((webJump) => {
                    licenseUsageSourceData.push(
                        this.generateAssetLicenseUsageSourceData(
                            JumpItemType.WebJump,
                            webJump,
                            associatedGroupPolicy,
                            associatedGroupPolicyJumpGroup,
                        ),
                    );
                });

                jumpClients.forEach((jumpClient) => {
                    licenseUsageSourceData.push(
                        this.generateAssetLicenseUsageSourceData(
                            JumpItemType.JumpClient,
                            jumpClient,
                            associatedGroupPolicy,
                            associatedGroupPolicyJumpGroup,
                        ),
                    );
                });
            }
        }

        // Calculate based on uniqueness for each jump item type
        // Use Set<string> to ensure uniqueness
        const uniqueObjects = new Set<string>();

        licenseUsageSourceData.forEach((data) => {
            if (
                data.jumpItemType === JumpItemType.RemoteRdp ||
                data.jumpItemType === JumpItemType.RemoteVnc ||
                data.jumpItemType === JumpItemType.ShellJump ||
                data.jumpItemType === JumpItemType.ProtocolTunnelJump
            ) {
                uniqueObjects.add(
                    JSON.stringify({
                        jumpointId: data.jumpItemJumpointId,
                        hostname: data.jumpItemHostname,
                    }),
                );
            }

            if (data.jumpItemType === JumpItemType.WebJump) {
                uniqueObjects.add(
                    JSON.stringify({
                        name: data.jumpItemName,
                        jumpointId: data.jumpItemJumpointId,
                        endpointUrl: data.jumpItemEndpointUrl,
                    }),
                );
            }

            if (data.jumpItemType === JumpItemType.JumpClient) {
                uniqueObjects.add(
                    JSON.stringify({
                        fqdn: data.jumpItemFqdn,
                    }),
                );
            }
        });

        return {
            totalLicenseUsage: uniqueObjects.size,
            licenseUsageSourceData: licenseUsageSourceData,
        };
    }

    private async getCustomerAssociatedGroupPolicies(transactionId: string, customer: Customer) {
        return await PaginationUtility.queryUntilLastPage<GroupPolicy>((pageNumber: number) =>
            this.queryBus.execute<RetrieveGroupPoliciesQuery, GroupPolicy[]>(
                new RetrieveGroupPoliciesQuery(
                    transactionId,
                    customer.beyondtrustInstanceId,
                    CalculateAssetLicenseUsageCommandHandler.MAX_PAGE_RETRIEVAL_SIZE,
                    pageNumber,
                    undefined,
                    `%${customer.name.toUpperCase()}%`,
                ),
            ),
        );
    }

    private generateAssetLicenseUsageSourceData(
        jumpItemType: JumpItemType,
        jumpItem: RemoteRdp | RemoteVnc | ShellJump | WebJump | ProtocolTunnelJump | JumpClient,
        groupPolicy: GroupPolicy,
        groupPolicyJumpGroup: GroupPolicyJumpGroup,
    ): AssetLicenseUsageSourceData {
        return {
            groupPolicyId: groupPolicy.id,
            groupPolicyName: groupPolicy.name,
            groupPolicyLastSyncDate: groupPolicy.lastSyncDate,
            groupPolicyJumpGroupLastSyncDate: groupPolicyJumpGroup.lastSyncDate,
            jumpGroupId: groupPolicyJumpGroup.jumpGroupId,
            jumpGroupName: (groupPolicyJumpGroup as unknown as { jumpGroup: JumpGroup }).jumpGroup.name,
            jumpGroupLastSyncDate: (groupPolicyJumpGroup as unknown as { jumpGroup: JumpGroup }).jumpGroup.lastSyncDate,
            jumpItemType: jumpItemType,
            jumpItemId: jumpItem.id,
            jumpItemName: jumpItem.name,
            jumpItemTag: jumpItem.tag,
            jumpItemJumpointId: [
                JumpItemType.RemoteRdp,
                JumpItemType.RemoteVnc,
                JumpItemType.ShellJump,
                JumpItemType.WebJump,
                JumpItemType.ProtocolTunnelJump,
            ].includes(jumpItemType)
                ? (<RemoteRdp | RemoteVnc | ShellJump | WebJump | ProtocolTunnelJump>jumpItem).jumpointId
                : undefined,
            jumpItemHostname: [
                JumpItemType.RemoteRdp,
                JumpItemType.RemoteVnc,
                JumpItemType.ShellJump,
                JumpItemType.ProtocolTunnelJump,
                JumpItemType.JumpClient,
            ].includes(jumpItemType)
                ? (<RemoteRdp | RemoteVnc | ShellJump | ProtocolTunnelJump | JumpClient>jumpItem).hostname
                : undefined,
            jumpItemEndpointUrl: jumpItemType === JumpItemType.WebJump ? (<WebJump>jumpItem).url : undefined,
            jumpItemFqdn: jumpItemType === JumpItemType.JumpClient ? (<JumpClient>jumpItem).fqdn : undefined,
            jumpItemLastSyncDate: jumpItem.lastSyncDate,
        };
    }
}
