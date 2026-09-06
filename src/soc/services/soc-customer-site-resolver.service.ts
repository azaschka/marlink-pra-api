import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Customer } from '../../customer/models';
import { RetrieveCustomersQuery } from '../../customer/queries';
import { PaginationUtility } from '../../shared/utilities';
import { Site } from '../../site/models';
import { RetrieveSitesQuery } from '../../site/queries';
import { SocCustomerSiteResolver } from '../utilities';

/**
 * Loads the customer and site catalogue once per request and turns it into a resolver.
 *
 * Deliberately loads *all* customers, not just the ones in the caller's scope: attribution
 * must be computed before the scope filter is applied, otherwise objects of other customers
 * would be reported as `Unmapped` instead of being filtered out.
 */
@Injectable()
export class SocCustomerSiteResolverService {
    private static readonly PAGE_SIZE = 100;

    constructor(private readonly queryBus: QueryBus) {}

    public async create(transactionId: string, tenantId: number): Promise<SocCustomerSiteResolver> {
        const [customers, sites] = await Promise.all([
            this.retrieveAllCustomers(transactionId, tenantId),
            this.retrieveAllSites(transactionId),
        ]);

        return new SocCustomerSiteResolver(customers, sites);
    }

    private retrieveAllCustomers(transactionId: string, tenantId: number): Promise<Customer[]> {
        return PaginationUtility.queryUntilLastPage((pageNumber) =>
            this.queryBus.execute<RetrieveCustomersQuery, Customer[]>(
                new RetrieveCustomersQuery(
                    transactionId,
                    SocCustomerSiteResolverService.PAGE_SIZE,
                    pageNumber,
                    undefined, // key
                    undefined, // name
                    undefined, // namePattern
                    undefined, // businessUnits — attribution must cover every customer
                    tenantId,
                ),
            ),
        );
    }

    private retrieveAllSites(transactionId: string): Promise<Site[]> {
        return PaginationUtility.queryUntilLastPage((pageNumber) =>
            this.queryBus.execute<RetrieveSitesQuery, Site[]>(
                new RetrieveSitesQuery(transactionId, SocCustomerSiteResolverService.PAGE_SIZE, pageNumber),
            ),
        );
    }
}
