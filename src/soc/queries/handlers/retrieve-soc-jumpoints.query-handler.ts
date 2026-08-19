import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import { Customer } from '../../../customer/models';
import { RetrieveCustomersQuery } from '../../../customer/queries';
import { Jumpoint } from '../../../jumpoint/models';
import { RetrieveJumpointsQuery } from '../../../jumpoint/queries';
import { PaginationUtility } from '../../../shared/utilities';
import { Site } from '../../../site/models/site.model';
import { RetrieveSitesQuery } from '../../../site/queries';
import { SocJumpoint } from '../../models';
import { SocJumpointUtility } from '../../utilities';
import { RetrieveSocJumpointsQuery } from '../retrieve-soc-jumpoints.query';

@QueryHandler(RetrieveSocJumpointsQuery)
export class RetrieveSocJumpointsQueryHandler implements IQueryHandler<RetrieveSocJumpointsQuery> {
    private static readonly PAGE_SIZE = 100;

    constructor(private readonly queryBus: QueryBus) {}

    public async execute(query: RetrieveSocJumpointsQuery): Promise<SocJumpoint[]> {
        const socJumpoints: SocJumpoint[] = [];

        for (const { customerKey, siteKey } of query.customerSiteInfo ?? []) {
            const { customer, site } = await this.retrieveCustomerAndSite(query.transactionId, customerKey, siteKey);

            const jumpointNamePattern = SocJumpointUtility.generateNamePattern(customer, site);
            const jumpoints = await this.retrieveJumpoints(query.transactionId, query.tenantId, jumpointNamePattern);

            socJumpoints.push(
                ...jumpoints.map((jumpoint) => ({
                    jumpoint,
                    customerKey: customer?.key,
                    customerName: customer?.name,
                    siteKey: site?.key,
                    siteName: site?.name,
                })),
            );
        }

        return socJumpoints;
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
                    RetrieveSocJumpointsQueryHandler.PAGE_SIZE,
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
}
