import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import { AxiosResponse } from 'axios';
import { BusinessUnit } from '../../../customer/enums';
import { Customer } from '../../../customer/models';
import { RetrieveCustomersQuery } from '../../../customer/queries';
import { ErrorProcessorUtility, PaginationUtility } from '../../../shared/utilities';
import { Site } from '../../../site/models';
import { RetrieveSitesQuery } from '../../../site/queries';
import { Jumpoint } from '../../models';
import { RetrieveJumpointInstallerByCustomerAndSiteQuery } from '../retrieve-jumpoint-installer-by-customer-and-site.query';
import { RetrieveJumpointInstallerQuery } from '../retrieve-jumpoint-installer.query';
import { RetrieveJumpointsQuery } from '../retrieve-jumpoints.query';

@QueryHandler(RetrieveJumpointInstallerByCustomerAndSiteQuery)
export class RetrieveJumpointInstallerByCustomerAndSiteQueryHandler
    implements IQueryHandler<RetrieveJumpointInstallerByCustomerAndSiteQuery>
{
    private static readonly MAX_PAGE_RETRIEVAL_SIZE = 100;

    constructor(private readonly queryBus: QueryBus) {}

    public async execute(
        query: RetrieveJumpointInstallerByCustomerAndSiteQuery,
    ): Promise<AxiosResponse<NodeJS.ReadableStream>> {
        const customer = await this.getCustomer(query.transactionId, query.customerKey, query.businessUnit);
        const site = await this.getSite(query.transactionId, query.siteKey, query.customerKey);
        const jumpoints = await this.getJumpoints(query.transactionId, customer, site);
        const jumpointsWithKeyInfo = this.filterJumpointWithKeyInfo(
            jumpoints,
            query.businessUnit,
            query.customerKey,
            query.siteKey,
        );

        for (const jumpoint of jumpointsWithKeyInfo) {
            try {
                return await this.queryBus.execute<
                    RetrieveJumpointInstallerQuery,
                    AxiosResponse<NodeJS.ReadableStream>
                >(new RetrieveJumpointInstallerQuery(query.transactionId, jumpoint.id));
            } catch (error) {
                console.error(
                    `Failed to retrieve jumpoint installer for jumpoint with id ${jumpoint.id}.`,
                    ErrorProcessorUtility.stringify(error),
                );

                continue;
            }
        }

        throw new Error(
            `Failed to download every jumpoint installers for business unit ${query.businessUnit}, customer key ${query.customerKey} and site key ${query.siteKey}.`,
        );
    }

    private async getCustomer(transactionId: string, customerKey: string, businessUnit: BusinessUnit) {
        const customers = await this.queryBus.execute<RetrieveCustomersQuery, Customer[]>(
            new RetrieveCustomersQuery(transactionId, 1, 1, customerKey),
        );

        if (customers.length === 0 || !customers[0]) {
            throw new NotFoundException(`Customer with key ${customerKey} not found.`);
        }

        if (customers[0].businessUnit !== businessUnit) {
            throw new NotFoundException(
                `Customer with key ${customerKey} is found under business unit ${customers[0].businessUnit} but the request was made for business unit ${businessUnit}.`,
            );
        }

        return customers[0];
    }

    private async getSite(transactionId: string, siteKey: string, customerKey: string) {
        const sites = await this.queryBus.execute<RetrieveSitesQuery, Site[]>(
            new RetrieveSitesQuery(transactionId, 1, 1, siteKey, undefined, customerKey),
        );

        if (sites.length === 0 || !sites[0]) {
            throw new NotFoundException(`Site with key ${siteKey} and customer key ${customerKey} not found.`);
        }

        return sites[0];
    }

    private async getJumpoints(transactionId: string, customer: Customer, site: Site) {
        const jumpoints = await PaginationUtility.queryUntilLastPage((pageNumber: number) =>
            this.queryBus.execute<RetrieveJumpointsQuery, Jumpoint[]>(
                new RetrieveJumpointsQuery(
                    transactionId,
                    RetrieveJumpointInstallerByCustomerAndSiteQueryHandler.MAX_PAGE_RETRIEVAL_SIZE,
                    pageNumber,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    `${customer.businessUnit}%${customer.name.toUpperCase()}_${site.name.toUpperCase()}_${site.key.toUpperCase()}`,
                ),
            ),
        );

        if (jumpoints.length === 0) {
            throw new NotFoundException(
                `No jumpoints found for name pattern search '${customer.businessUnit}%${customer.name.toUpperCase()}_${site.name.toUpperCase()}_${site.key.toUpperCase()}'`,
            );
        }

        return jumpoints;
    }

    private filterJumpointWithKeyInfo(
        jumpoints: Jumpoint[],
        businessUnit: BusinessUnit,
        customerKey: string,
        siteKey: string,
    ) {
        const jumpointsWithKeyInfo = jumpoints.filter((jumpoint) => !!jumpoint.keyInfo);

        if (jumpointsWithKeyInfo.length === 0) {
            throw new NotFoundException(
                `No jumpoint installer found for business unit ${businessUnit}, customer key ${customerKey} and site key ${siteKey}.`,
            );
        }

        return jumpointsWithKeyInfo;
    }
}
