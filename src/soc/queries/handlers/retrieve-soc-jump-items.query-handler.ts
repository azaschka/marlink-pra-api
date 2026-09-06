import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
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
import { SocJumpItemType } from '../../enums';
import { JumpointBoundJumpItem, SocCustomerSiteMapping, SocJumpItem, SocPagedResult } from '../../models';
import { SocAggregateCacheService, SocCustomerSiteResolverService } from '../../services';
import { SocCustomerSiteResolver, SocFilterUtility } from '../../utilities';
import { RetrieveSocJumpItemsQuery } from '../retrieve-soc-jump-items.query';

/** Everything needed to attribute a jump item, loaded once per request. */
interface AttributionContext {
    resolver: SocCustomerSiteResolver;
    jumpointsById: Map<number, Jumpoint>;
    jumpGroupsById: Map<number, JumpGroup>;
    jumpPoliciesById: Map<number, JumpPolicy>;
}

/**
 * Retrieves every jump item on the platform, regardless of protocol, and attributes each
 * one to a customer/site.
 *
 * Items are loaded per type without any name or group filter and are attributed afterwards
 * by reversing the naming conventions. This is what makes "get all" possible: items that
 * follow no convention are still returned, flagged as `Unmapped`.
 */
@QueryHandler(RetrieveSocJumpItemsQuery)
export class RetrieveSocJumpItemsQueryHandler implements IQueryHandler<RetrieveSocJumpItemsQuery> {
    private static readonly PAGE_SIZE = 100;

    constructor(
        private readonly queryBus: QueryBus,
        private readonly resolverService: SocCustomerSiteResolverService,
        private readonly cacheService: SocAggregateCacheService,
    ) {}

    public async execute(query: RetrieveSocJumpItemsQuery): Promise<SocPagedResult<SocJumpItem>> {
        // Cached unfiltered, so that one snapshot serves every page and every filter
        // combination. Scope and filters are applied per request below.
        const socJumpItems = await this.cacheService.resolve(`soc-jump-items:${query.tenantId}`, () =>
            this.aggregate(query.transactionId, query.tenantId),
        );

        const filtered = SocFilterUtility.apply(socJumpItems, {
            customerKey: query.customerKey,
            siteKey: query.siteKey,
            mappingStatus: query.mappingStatus,
            scopedCustomerKeys: query.scopedCustomerKeys,
        });

        return {
            items: PaginationUtility.slicePage(filtered, query.pageNumber, query.pageSize),
            totalCount: filtered.length,
        };
    }

    private async aggregate(transactionId: string, tenantId: number): Promise<SocJumpItem[]> {
        const [
            resolver,
            jumpoints,
            jumpGroups,
            jumpPolicies,
            protocolTunnelJumps,
            remoteRdps,
            remoteVncs,
            shellJumps,
            webJumps,
            jumpClients,
        ] = await Promise.all([
            this.resolverService.create(transactionId, tenantId),
            this.retrieveAll<Jumpoint>(
                (pageNumber) => new RetrieveJumpointsQuery(transactionId, tenantId, this.pageSize, pageNumber),
            ),
            this.retrieveAll<JumpGroup>(
                (pageNumber) => new RetrieveJumpGroupsQuery(transactionId, tenantId, this.pageSize, pageNumber),
            ),
            this.retrieveAll<JumpPolicy>(
                (pageNumber) => new RetrieveJumpPoliciesQuery(transactionId, tenantId, this.pageSize, pageNumber),
            ),
            this.retrieveAll<ProtocolTunnelJump>(
                (pageNumber) =>
                    new RetrieveProtocolTunnelJumpsQuery(transactionId, tenantId, this.pageSize, pageNumber),
            ),
            this.retrieveAll<RemoteRdp>(
                (pageNumber) => new RetrieveRemoteRdpsQuery(transactionId, tenantId, this.pageSize, pageNumber),
            ),
            this.retrieveAll<RemoteVnc>(
                (pageNumber) => new RetrieveRemoteVncsQuery(transactionId, tenantId, this.pageSize, pageNumber),
            ),
            this.retrieveAll<ShellJump>(
                (pageNumber) => new RetrieveShellJumpsQuery(transactionId, tenantId, this.pageSize, pageNumber),
            ),
            this.retrieveAll<WebJump>(
                (pageNumber) => new RetrieveWebJumpsQuery(transactionId, tenantId, this.pageSize, pageNumber),
            ),
            this.retrieveAll<JumpClient>(
                (pageNumber) => new RetrieveJumpClientsQuery(transactionId, tenantId, this.pageSize, pageNumber),
            ),
        ]);

        const context: AttributionContext = {
            resolver,
            jumpointsById: new Map(jumpoints.map((jumpoint) => [jumpoint.id, jumpoint])),
            jumpGroupsById: new Map(jumpGroups.map((jumpGroup) => [jumpGroup.id, jumpGroup])),
            jumpPoliciesById: new Map(jumpPolicies.map((jumpPolicy) => [jumpPolicy.id, jumpPolicy])),
        };

        return [
            ...this.mapJumpointBoundItems(protocolTunnelJumps, SocJumpItemType.ProtocolTunnelJump, context),
            ...this.mapJumpointBoundItems(remoteRdps, SocJumpItemType.RemoteRdp, context),
            ...this.mapJumpointBoundItems(remoteVncs, SocJumpItemType.RemoteVnc, context),
            ...this.mapJumpointBoundItems(shellJumps, SocJumpItemType.ShellJump, context),
            ...this.mapJumpointBoundItems(webJumps, SocJumpItemType.WebJump, context),
            ...this.mapJumpClients(jumpClients, context),
        ];
    }

    private get pageSize(): number {
        return RetrieveSocJumpItemsQueryHandler.PAGE_SIZE;
    }

    private retrieveAll<TResult>(createQuery: (pageNumber: number) => object): Promise<TResult[]> {
        return PaginationUtility.queryUntilLastPage((pageNumber) =>
            this.queryBus.execute<object, TResult[]>(createQuery(pageNumber)),
        );
    }

    private mapJumpointBoundItems(
        jumpItems: JumpointBoundJumpItem[],
        jumpItemType: SocJumpItemType,
        context: AttributionContext,
    ): SocJumpItem[] {
        return jumpItems.map((jumpItem) => ({
            jumpItemType,
            jumpItem,
            ...this.attribute(
                context,
                context.jumpointsById.get(jumpItem.jumpointId)?.name,
                jumpItem.jumpPolicyId,
                jumpItem.jumpGroupId,
            ),
        }));
    }

    private mapJumpClients(jumpClients: JumpClient[], context: AttributionContext): SocJumpItem[] {
        return jumpClients.map((jumpClient) => ({
            jumpItemType: SocJumpItemType.JumpClient,
            jumpItem: jumpClient,
            // Jump clients are not bound to a jumpoint; their owner is encoded in the
            // jump policy or, failing that, in the jump group name.
            ...this.attribute(context, undefined, jumpClient.jumpPolicyId, jumpClient.jumpGroupId),
        }));
    }

    /**
     * Attributes an item using the most specific source available, falling back to
     * progressively coarser ones. Returns `Unmapped` when no source yields a match.
     */
    private attribute(
        context: AttributionContext,
        jumpointName: string | undefined,
        jumpPolicyId: number | null | undefined,
        jumpGroupId: number | undefined,
    ): SocCustomerSiteMapping {
        if (jumpointName !== undefined) {
            const mapping = context.resolver.resolveFromJumpointName(jumpointName);

            if (this.isAttributed(mapping)) {
                return mapping;
            }
        }

        const jumpPolicy = jumpPolicyId ? context.jumpPoliciesById.get(jumpPolicyId) : undefined;

        if (jumpPolicy) {
            const mapping = context.resolver.resolveFromJumpPolicyDisplayName(jumpPolicy.displayName);

            if (this.isAttributed(mapping)) {
                return mapping;
            }
        }

        const jumpGroup = jumpGroupId ? context.jumpGroupsById.get(jumpGroupId) : undefined;

        if (jumpGroup) {
            const mapping = context.resolver.resolveFromJumpGroupName(jumpGroup.name);

            if (this.isAttributed(mapping)) {
                return mapping;
            }
        }

        return SocCustomerSiteResolver.unmapped;
    }

    private isAttributed(mapping: SocCustomerSiteMapping): boolean {
        return mapping !== SocCustomerSiteResolver.unmapped;
    }
}
