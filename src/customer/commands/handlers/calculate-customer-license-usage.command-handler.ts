import { NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { GroupPolicyJumpGroup } from '../../../group-policy-jump-group/models';
import { RetrieveGroupPolicyJumpGroupsQuery } from '../../../group-policy-jump-group/queries';
import { GroupPolicyMember } from '../../../group-policy-member/models';
import { RetrieveGroupPolicyMembersQuery } from '../../../group-policy-member/queries';
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
import { User } from '../../../user/models';
import { BillingType, JumpItemType } from '../../enums';
import { CustomerLicenseUsageCalculatedEvent } from '../../events';
import { AssetLicenseUsageSourceData, Customer, CustomerLicenseUsage, UserLicenseUsageSourceData } from '../../models';
import { CustomerRepositoryService } from '../../repositories/services/customer-repository.service';
import { CalculateCustomerLicenseUsageCommand } from '../calculate-customer-license-usage.command';

@CommandHandler(CalculateCustomerLicenseUsageCommand)
export class CalculateCustomerLicenseUsageCommandHandler
    implements ICommandHandler<CalculateCustomerLicenseUsageCommand>
{
    private static readonly MAX_PAGE_RETRIEVAL_SIZE = 100;

    constructor(
        private readonly queryBus: QueryBus,
        private readonly eventBus: EventBus,
        private readonly customerRepositoryService: CustomerRepositoryService,
    ) {}

    public async execute(command: CalculateCustomerLicenseUsageCommand): Promise<CustomerLicenseUsage> {
        const customer = await this.customerRepositoryService.findOneById(command.id);

        if (!customer) {
            throw new NotFoundException();
        }

        let totalLicenseUsage: number = 0;
        let licenseUsageSourceData: UserLicenseUsageSourceData[] | AssetLicenseUsageSourceData[] = [];

        if (customer.billingType === BillingType.User) {
            ({ totalLicenseUsage, licenseUsageSourceData } = await this.calculateLicenseUsageForUserBillingType(
                command.transactionId,
                customer,
            ));
        } else {
            ({ totalLicenseUsage, licenseUsageSourceData } = await this.calculateLicenseUsageForAssetBillingType(
                command.transactionId,
                customer,
            ));
        }

        const customerLicenseUsage: CustomerLicenseUsage = {
            customerId: customer.id,
            billingType: customer.billingType,
            totalLicenseUsage: totalLicenseUsage,
            licenseUsageSourceData: licenseUsageSourceData,
        };

        this.eventBus.publish(
            new CustomerLicenseUsageCalculatedEvent(command.transactionId, {
                customerLicenseUsage,
            }),
        );

        return customerLicenseUsage;
    }

    private async calculateLicenseUsageForUserBillingType(transactionId: string, customer: Customer) {
        const licenseUsageSourceData: UserLicenseUsageSourceData[] = [];

        const associatedGroupPolicies = await this.getCustomerAssociatedGroupPolicies(transactionId, customer);

        for (const associatedGroupPolicy of associatedGroupPolicies) {
            const groupPolicyMembers = await PaginationUtility.queryUntilLastPage<GroupPolicyMember>(
                (pageNumber: number) =>
                    this.queryBus.execute<RetrieveGroupPolicyMembersQuery, GroupPolicyMember[]>(
                        new RetrieveGroupPolicyMembersQuery(
                            transactionId,
                            CalculateCustomerLicenseUsageCommandHandler.MAX_PAGE_RETRIEVAL_SIZE,
                            pageNumber,
                            associatedGroupPolicy.id,
                        ),
                    ),
            );

            groupPolicyMembers.forEach((groupPolicyMember) => {
                licenseUsageSourceData.push({
                    groupPolicyId: associatedGroupPolicy.id,
                    groupPolicyName: associatedGroupPolicy.name,
                    groupPolicyLastSyncDate: associatedGroupPolicy.lastSyncDate,
                    groupPolicyMemberLastSyncDate: groupPolicyMember.lastSyncDate,
                    memberId: groupPolicyMember.memberId,
                    userId: groupPolicyMember.userId,
                    username: (groupPolicyMember as unknown as { user: User }).user.username,
                    userLastSyncDate: (groupPolicyMember as unknown as { user: User }).user.lastSyncDate,
                });
            });
        }

        // Calculate using the number of unique users
        const uniqueUserIds = new Set<number>();
        licenseUsageSourceData.forEach((data) => {
            uniqueUserIds.add(data.userId);
        });

        return {
            totalLicenseUsage: uniqueUserIds.size,
            licenseUsageSourceData: licenseUsageSourceData,
        };
    }

    private async calculateLicenseUsageForAssetBillingType(transactionId: string, customer: Customer) {
        const licenseUsageSourceData: AssetLicenseUsageSourceData[] = [];

        const associatedGroupPolicies = await this.getCustomerAssociatedGroupPolicies(transactionId, customer);

        for (const associatedGroupPolicy of associatedGroupPolicies) {
            const allAssociatedGroupPolicyJumpGroups = await PaginationUtility.queryUntilLastPage<GroupPolicyJumpGroup>(
                (pageNumber: number) =>
                    this.queryBus.execute<RetrieveGroupPolicyJumpGroupsQuery, GroupPolicyJumpGroup[]>(
                        new RetrieveGroupPolicyJumpGroupsQuery(
                            transactionId,
                            CalculateCustomerLicenseUsageCommandHandler.MAX_PAGE_RETRIEVAL_SIZE,
                            pageNumber,
                            associatedGroupPolicy.id,
                        ),
                    ),
            );

            for (const associatedGroupPolicyJumpGroup of allAssociatedGroupPolicyJumpGroups) {
                const remoteRdps = await PaginationUtility.queryUntilLastPage<RemoteRdp>((pageNumber: number) =>
                    this.queryBus.execute<RetrieveRemoteRdpsQuery, RemoteRdp[]>(
                        new RetrieveRemoteRdpsQuery(
                            transactionId,
                            CalculateCustomerLicenseUsageCommandHandler.MAX_PAGE_RETRIEVAL_SIZE,
                            pageNumber,
                            undefined,
                            undefined,
                            associatedGroupPolicyJumpGroup.jumpGroupId,
                        ),
                    ),
                );

                const remoteVncs = await PaginationUtility.queryUntilLastPage<RemoteVnc>((pageNumber: number) =>
                    this.queryBus.execute<RetrieveRemoteVncsQuery, RemoteVnc[]>(
                        new RetrieveRemoteVncsQuery(
                            transactionId,
                            CalculateCustomerLicenseUsageCommandHandler.MAX_PAGE_RETRIEVAL_SIZE,
                            pageNumber,
                            undefined,
                            undefined,
                            associatedGroupPolicyJumpGroup.jumpGroupId,
                        ),
                    ),
                );

                const shellJumps = await PaginationUtility.queryUntilLastPage<ShellJump>((pageNumber: number) =>
                    this.queryBus.execute<RetrieveShellJumpsQuery, ShellJump[]>(
                        new RetrieveShellJumpsQuery(
                            transactionId,
                            CalculateCustomerLicenseUsageCommandHandler.MAX_PAGE_RETRIEVAL_SIZE,
                            pageNumber,
                            undefined,
                            undefined,
                            associatedGroupPolicyJumpGroup.jumpGroupId,
                        ),
                    ),
                );

                const protocolTunnelJumps = await PaginationUtility.queryUntilLastPage<ProtocolTunnelJump>(
                    (pageNumber: number) =>
                        this.queryBus.execute<RetrieveProtocolTunnelJumpsQuery, ProtocolTunnelJump[]>(
                            new RetrieveProtocolTunnelJumpsQuery(
                                transactionId,
                                CalculateCustomerLicenseUsageCommandHandler.MAX_PAGE_RETRIEVAL_SIZE,
                                pageNumber,
                                undefined,
                                undefined,
                                associatedGroupPolicyJumpGroup.jumpGroupId,
                            ),
                        ),
                );

                const webJumps = await PaginationUtility.queryUntilLastPage<WebJump>((pageNumber: number) =>
                    this.queryBus.execute<RetrieveWebJumpsQuery, WebJump[]>(
                        new RetrieveWebJumpsQuery(
                            transactionId,
                            CalculateCustomerLicenseUsageCommandHandler.MAX_PAGE_RETRIEVAL_SIZE,
                            pageNumber,
                            undefined,
                            undefined,
                            associatedGroupPolicyJumpGroup.jumpGroupId,
                        ),
                    ),
                );

                const jumpClients = await PaginationUtility.queryUntilLastPage<JumpClient>((pageNumber: number) =>
                    this.queryBus.execute<RetrieveJumpClientsQuery, JumpClient[]>(
                        new RetrieveJumpClientsQuery(
                            transactionId,
                            CalculateCustomerLicenseUsageCommandHandler.MAX_PAGE_RETRIEVAL_SIZE,
                            pageNumber,
                            undefined,
                            undefined,
                            undefined,
                            undefined,
                            associatedGroupPolicyJumpGroup.jumpGroupId,
                        ),
                    ),
                );

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
                    }),
                );
            }

            if (data.jumpItemType === JumpItemType.WebJump) {
                uniqueObjects.add(
                    JSON.stringify({
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
                    CalculateCustomerLicenseUsageCommandHandler.MAX_PAGE_RETRIEVAL_SIZE,
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
