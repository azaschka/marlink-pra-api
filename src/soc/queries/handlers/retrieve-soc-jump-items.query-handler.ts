import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import { Customer } from '../../../customer/models';
import { RetrieveCustomersQuery } from '../../../customer/queries';
import { JumpClient } from '../../../jump-client/models';
import { RetrieveJumpClientsQuery } from '../../../jump-client/queries';
import { JumpGroup } from '../../../jump-group/models';
import { RetrieveJumpGroupsQuery } from '../../../jump-group/queries';
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
import { JumpPolicy } from '../../../jump-policy/models';
import { RetrieveJumpPoliciesQuery } from '../../../jump-policy/queries';
import { Jumpoint } from '../../../jumpoint/models';
import { RetrieveJumpointsQuery } from '../../../jumpoint/queries';
import { PaginationUtility } from '../../../shared/utilities';
import { Site } from '../../../site/models/site.model';
import { RetrieveSitesQuery } from '../../../site/queries';
import { SocJumpItemType } from '../../enums';
import { SocJumpItem } from '../../models';
import { SocJumpItemUtility, SocJumpointUtility, SocJumpPolicyUtility } from '../../utilities';
import { RetrieveSocJumpItemsQuery } from '../retrieve-soc-jump-items.query';

@QueryHandler(RetrieveSocJumpItemsQuery)
export class RetrieveSocJumpItemsQueryHandler implements IQueryHandler<RetrieveSocJumpItemsQuery> {
    private static readonly PAGE_SIZE = 100;

    constructor(private readonly queryBus: QueryBus) {}

    public async execute(query: RetrieveSocJumpItemsQuery): Promise<SocJumpItem[]> {
        const socJumpItems: SocJumpItem[] = [];

        for (const { customerKey, siteKey } of query.customerSiteInfo ?? []) {
            const { customer, site } = await this.retrieveCustomerAndSite(query.transactionId, customerKey, siteKey);

            const jumpointSocJumpItems = await this.retrieveJumpointSocJumpItems(
                query.tenantId,
                query.transactionId,
                customer,
                site,
            );

            const jumpClientSocJumpItems = await this.retrieveJumpClientSocJumpItems(
                query.tenantId,
                query.transactionId,
                customer,
                site,
            );

            socJumpItems.push(...jumpointSocJumpItems, ...jumpClientSocJumpItems);
        }

        return socJumpItems;
    }

    private async retrieveCustomerAndSite(
        transactionId: string,
        customerKey: string | undefined,
        siteKey: string | undefined,
    ) {
        let customer = customerKey ? await this.retrieveCustomer(transactionId, customerKey) : undefined;
        const site = siteKey ? await this.retrieveSite(transactionId, siteKey, customerKey) : undefined;

        if (!customer && site) {
            customer = await this.retrieveCustomer(transactionId, site.customerKey);
        }
        return { customer, site };
    }

    private async retrieveCustomer(transactionId: string, customerKey: string): Promise<Customer> {
        const customers = await this.queryBus.execute<RetrieveCustomersQuery, Customer[]>(
            new RetrieveCustomersQuery(transactionId, 1, 1, customerKey),
        );

        if (customers.length === 0 || !customers[0]) {
            throw new NotFoundException(`Customer not found with key: ${customerKey}`);
        }

        return customers[0];
    }

    private async retrieveSite(transactionId: string, siteKey: string, customerKey: string | undefined): Promise<Site> {
        const sites = await this.queryBus.execute<RetrieveSitesQuery, Site[]>(
            new RetrieveSitesQuery(transactionId, 1, 1, siteKey, undefined, customerKey ? [customerKey] : undefined),
        );

        if (sites.length === 0 || !sites[0]) {
            throw new NotFoundException(
                `Site not found with key: ${siteKey} and customer key: ${customerKey ? customerKey : 'undefined'}`,
            );
        }

        return sites[0];
    }

    private async retrieveJumpointSocJumpItems(
        tenantId: number,
        transactionId: string,
        customer: Customer | undefined,
        site: Site | undefined,
    ) {
        const jumpointNamePattern = SocJumpointUtility.generateNamePattern(customer, site);
        const jumpoints = await this.retrieveJumpoints(transactionId, tenantId, jumpointNamePattern);

        await this.populateJumpointsJumpItems(transactionId, tenantId, jumpoints);

        return SocJumpItemUtility.mapJumpointJumpItemsToSocJumpItems(jumpoints, customer, site);
    }

    private async retrieveJumpoints(
        transactionId: string,
        tenantId: number,
        jumpointNamePattern: string,
    ): Promise<Jumpoint[]> {
        const jumpoints = await PaginationUtility.queryUntilLastPage((pageNumber) =>
            this.queryBus.execute<RetrieveJumpointsQuery, Jumpoint[]>(
                new RetrieveJumpointsQuery(
                    transactionId,
                    tenantId,
                    RetrieveSocJumpItemsQueryHandler.PAGE_SIZE,
                    pageNumber,
                    undefined, // name
                    undefined, // publicIp
                    undefined, // privateIp
                    undefined, // hostname
                    undefined, // codeName
                    [jumpointNamePattern],
                ),
            ),
        );

        return jumpoints;
    }

    private async populateJumpointsJumpItems(
        transactionId: string,
        tenantId: number,
        jumpoints: Jumpoint[],
    ): Promise<void> {
        // Ensure that the jump item arrays are initialized to empty arrays if they are undefined
        jumpoints.forEach((jumpoint) => {
            if (jumpoint.protocolTunnelJumps === undefined) {
                jumpoint.protocolTunnelJumps = [];
            }
            if (jumpoint.remoteRdps === undefined) {
                jumpoint.remoteRdps = [];
            }
            if (jumpoint.remoteVncs === undefined) {
                jumpoint.remoteVncs = [];
            }
            if (jumpoint.shellJumps === undefined) {
                jumpoint.shellJumps = [];
            }
            if (jumpoint.webJumps === undefined) {
                jumpoint.webJumps = [];
            }
        });

        for (const jumpoint of jumpoints) {
            const protocolTunnelJumps = await PaginationUtility.queryUntilLastPage((pageNumber) =>
                this.queryBus.execute<RetrieveProtocolTunnelJumpsQuery, ProtocolTunnelJump[]>(
                    new RetrieveProtocolTunnelJumpsQuery(
                        transactionId,
                        tenantId,
                        RetrieveSocJumpItemsQueryHandler.PAGE_SIZE,
                        pageNumber,
                        undefined, // name
                        undefined, // hostname
                        undefined, // jumpGroupIds
                        undefined, // jumpGroupType
                        jumpoint.id,
                    ),
                ),
            );
            const remoteRdps = await PaginationUtility.queryUntilLastPage((pageNumber) =>
                this.queryBus.execute<RetrieveRemoteRdpsQuery, RemoteRdp[]>(
                    new RetrieveRemoteRdpsQuery(
                        transactionId,
                        tenantId,
                        RetrieveSocJumpItemsQueryHandler.PAGE_SIZE,
                        pageNumber,
                        undefined, // name
                        undefined, // hostname
                        undefined, // jumpGroupIds
                        undefined, // jumpGroupType
                        jumpoint.id,
                    ),
                ),
            );
            const remoteVncs = await PaginationUtility.queryUntilLastPage((pageNumber) =>
                this.queryBus.execute<RetrieveRemoteVncsQuery, RemoteVnc[]>(
                    new RetrieveRemoteVncsQuery(
                        transactionId,
                        tenantId,
                        RetrieveSocJumpItemsQueryHandler.PAGE_SIZE,
                        pageNumber,
                        undefined, // name
                        undefined, // hostname
                        undefined, // jumpGroupIds
                        undefined, // jumpGroupType
                        jumpoint.id,
                    ),
                ),
            );
            const shellJumps = await PaginationUtility.queryUntilLastPage((pageNumber) =>
                this.queryBus.execute<RetrieveShellJumpsQuery, ShellJump[]>(
                    new RetrieveShellJumpsQuery(
                        transactionId,
                        tenantId,
                        RetrieveSocJumpItemsQueryHandler.PAGE_SIZE,
                        pageNumber,
                        undefined, // name
                        undefined, // hostname
                        undefined, // jumpGroupIds
                        undefined, // jumpGroupType
                        jumpoint.id,
                    ),
                ),
            );
            const webJumps = await PaginationUtility.queryUntilLastPage((pageNumber) =>
                this.queryBus.execute<RetrieveWebJumpsQuery, WebJump[]>(
                    new RetrieveWebJumpsQuery(
                        transactionId,
                        tenantId,
                        RetrieveSocJumpItemsQueryHandler.PAGE_SIZE,
                        pageNumber,
                        undefined, // name
                        undefined, // url
                        undefined, // jumpGroupIds
                        undefined, // jumpGroupType
                        jumpoint.id,
                    ),
                ),
            );

            jumpoint.protocolTunnelJumps?.push(...protocolTunnelJumps);
            jumpoint.remoteRdps?.push(...remoteRdps);
            jumpoint.remoteVncs?.push(...remoteVncs);
            jumpoint.shellJumps?.push(...shellJumps);
            jumpoint.webJumps?.push(...webJumps);
        }
    }

    private async retrieveJumpClientSocJumpItems(
        tenantId: number,
        transactionId: string,
        customer: Customer | undefined,
        site: Site | undefined,
    ): Promise<SocJumpItem[]> {
        const jumpClients: JumpClient[] = [];
        const jumpGroups = await this.retrieveJumpGroups(transactionId, tenantId, customer);
        const jumpPolicies = await this.retrieveJumpPolicies(transactionId, tenantId, customer, site);

        if (jumpGroups.length > 0) {
            const jumpGroupJumpClients = await PaginationUtility.queryUntilLastPage((pageNumber) =>
                this.queryBus.execute<RetrieveJumpClientsQuery, JumpClient[]>(
                    new RetrieveJumpClientsQuery(
                        transactionId,
                        tenantId,
                        RetrieveSocJumpItemsQueryHandler.PAGE_SIZE,
                        pageNumber,
                        undefined, // name
                        undefined, // hostname
                        undefined, // fqdn
                        undefined, // tag
                        jumpGroups.map((jg) => jg.id), // jumpGroupIds
                        undefined, // jumpGroupType
                        undefined, // consoleUser
                        undefined, // publicIp
                        undefined, // privateIp
                        undefined, // connectionType
                    ),
                ),
            );

            jumpClients.push(...jumpGroupJumpClients);
        }

        if (jumpPolicies.length > 0) {
            const jumpPolicyJumpClients = await PaginationUtility.queryUntilLastPage((pageNumber) =>
                this.queryBus.execute<RetrieveJumpClientsQuery, JumpClient[]>(
                    new RetrieveJumpClientsQuery(
                        transactionId,
                        tenantId,
                        RetrieveSocJumpItemsQueryHandler.PAGE_SIZE,
                        pageNumber,
                        undefined, // name
                        undefined, // hostname
                        undefined, // fqdn
                        undefined, // tag
                        undefined, // jumpGroupIds
                        undefined, // jumpGroupType
                        undefined, // consoleUser
                        undefined, // publicIp
                        undefined, // privateIp
                        undefined, // connectionType
                        jumpPolicies.map((jp) => jp.id), // jumpPolicyIds
                    ),
                ),
            );

            jumpClients.push(...jumpPolicyJumpClients);
        }

        return jumpClients.map((jumpClient) => ({
            jumpItemType: SocJumpItemType.JumpClient,
            jumpItem: jumpClient,
            customerKey: customer?.key,
            customerName: customer?.name,
            siteKey: site?.key,
            siteName: site?.name,
        }));
    }

    private async retrieveJumpGroups(
        transactionId: string,
        tenantId: number,
        customer: Customer | undefined,
    ): Promise<JumpGroup[]> {
        if (!customer) {
            return [];
        }

        const jumpGroups = await PaginationUtility.queryUntilLastPage((pageNumber) =>
            this.queryBus.execute<RetrieveJumpGroupsQuery, JumpGroup[]>(
                new RetrieveJumpGroupsQuery(
                    transactionId,
                    tenantId,
                    RetrieveSocJumpItemsQueryHandler.PAGE_SIZE,
                    pageNumber,
                    undefined, // name
                    undefined, // codeName
                    [`${customer.name.toUpperCase()}_%`],
                ),
            ),
        );

        return jumpGroups;
    }

    private async retrieveJumpPolicies(
        transactionId: string,
        tenantId: number,
        customer: Customer | undefined,
        site: Site | undefined,
    ): Promise<JumpPolicy[]> {
        const jumpPolicyNamePattern = SocJumpPolicyUtility.generateNamePattern(customer, site);

        const jumpPolicies = await PaginationUtility.queryUntilLastPage((pageNumber) =>
            this.queryBus.execute<RetrieveJumpPoliciesQuery, JumpPolicy[]>(
                new RetrieveJumpPoliciesQuery(
                    transactionId,
                    tenantId,
                    RetrieveSocJumpItemsQueryHandler.PAGE_SIZE,
                    pageNumber,
                    undefined, // codeName
                    [jumpPolicyNamePattern],
                ),
            ),
        );

        return jumpPolicies;
    }
}
