import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import { Jumpoint } from '../../../jumpoint/models';
import { RetrieveJumpointsQuery } from '../../../jumpoint/queries';
import { PaginationUtility } from '../../../shared/utilities';
import { SocJumpoint, SocPagedResult } from '../../models';
import { SocAggregateCacheService, SocCustomerSiteResolverService } from '../../services';
import { SocFilterUtility } from '../../utilities';
import { RetrieveSocJumpointsQuery } from '../retrieve-soc-jumpoints.query';

/**
 * Retrieves every jumpoint on the platform and attributes each one to a customer/site.
 *
 * Jumpoints are loaded without any name filter, so jumpoints that do not follow the
 * Marlink naming convention are returned as well — flagged as `Unmapped`.
 */
@QueryHandler(RetrieveSocJumpointsQuery)
export class RetrieveSocJumpointsQueryHandler implements IQueryHandler<RetrieveSocJumpointsQuery> {
    private static readonly PAGE_SIZE = 100;

    constructor(
        private readonly queryBus: QueryBus,
        private readonly resolverService: SocCustomerSiteResolverService,
        private readonly cacheService: SocAggregateCacheService,
    ) {}

    public async execute(query: RetrieveSocJumpointsQuery): Promise<SocPagedResult<SocJumpoint>> {
        // Cached unfiltered, so that one snapshot serves every page and every filter
        // combination. Scope and filters are applied per request below.
        const socJumpoints = await this.cacheService.resolve(`soc-jumpoints:${query.tenantId}`, () =>
            this.aggregate(query.transactionId, query.tenantId),
        );

        const filtered = SocFilterUtility.apply(socJumpoints, {
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

    private async aggregate(transactionId: string, tenantId: number): Promise<SocJumpoint[]> {
        const [resolver, jumpoints] = await Promise.all([
            this.resolverService.create(transactionId, tenantId),
            this.retrieveAllJumpoints(transactionId, tenantId),
        ]);

        return jumpoints.map((jumpoint) => ({
            jumpoint,
            ...resolver.resolveFromJumpointName(jumpoint.name),
        }));
    }

    private retrieveAllJumpoints(transactionId: string, tenantId: number): Promise<Jumpoint[]> {
        return PaginationUtility.queryUntilLastPage((pageNumber) =>
            this.queryBus.execute<RetrieveJumpointsQuery, Jumpoint[]>(
                new RetrieveJumpointsQuery(
                    transactionId,
                    tenantId,
                    RetrieveSocJumpointsQueryHandler.PAGE_SIZE,
                    pageNumber,
                ),
            ),
        );
    }
}
