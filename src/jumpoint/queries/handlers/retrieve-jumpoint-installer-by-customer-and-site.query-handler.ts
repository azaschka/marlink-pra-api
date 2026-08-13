import { Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import { AxiosResponse } from 'axios';
import { BusinessUnit } from '../../../beyondtrust-instance/enums';
import { BeyondtrustInstance } from '../../../beyondtrust-instance/models';
import { RetrieveBeyondtrustInstancesQuery } from '../../../beyondtrust-instance/queries';
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
export class RetrieveJumpointInstallerByCustomerAndSiteQueryHandler implements IQueryHandler<RetrieveJumpointInstallerByCustomerAndSiteQuery> {
    private static readonly MAX_PAGE_RETRIEVAL_SIZE = 100;

    private readonly logger = new Logger(RetrieveJumpointInstallerByCustomerAndSiteQueryHandler.name);

    constructor(private readonly queryBus: QueryBus) {}

    public async execute(
        query: RetrieveJumpointInstallerByCustomerAndSiteQuery,
    ): Promise<AxiosResponse<NodeJS.ReadableStream>> {
        this.logger.log({
            transactionId: query.transactionId,
            businessUnits: query.businessUnits,
            customerKey: query.customerKey,
            siteKey: query.siteKey,
        });

        const customer = await this.getCustomer(query.transactionId, query.customerKey, query.businessUnits);
        const site = await this.getSite(query.transactionId, query.siteKey, query.customerKey);
        const tenantJumpoints = await this.getJumpoints(query.transactionId, customer, site, query.businessUnits);
        this.logger.log({
            transactionId: query.transactionId,
            jumpoints: tenantJumpoints.map(({ tenantId, jumpoint }) => ({
                tenantId,
                jumpointId: jumpoint.id,
                jumpointName: jumpoint.name,
                hasKeyInfo: !!jumpoint.keyInfo,
            })),
        });

        const tenantJumpointsWithKeyInfo = this.filterJumpointsWithKeyInfo(
            tenantJumpoints,
            query.businessUnits,
            query.customerKey,
            query.siteKey,
        );

        for (const tenantJumpoint of tenantJumpointsWithKeyInfo) {
            try {
                this.logger.log({
                    event: 'jumpoint-installer-download-attempt',
                    transactionId: query.transactionId,
                    attemptedTenantId: tenantJumpoint.tenantId,
                    attemptedJumpointId: tenantJumpoint.jumpoint.id,
                    attemptedJumpointName: tenantJumpoint.jumpoint.name,
                });

                const response = await this.queryBus.execute<
                    RetrieveJumpointInstallerQuery,
                    AxiosResponse<NodeJS.ReadableStream>
                >(
                    new RetrieveJumpointInstallerQuery(
                        query.transactionId,
                        tenantJumpoint.tenantId,
                        tenantJumpoint.jumpoint.id,
                    ),
                );

                const responseHeaders = response.headers as Record<string, unknown>;

                this.logger.log({
                    event: 'jumpoint-installer-selected',
                    transactionId: query.transactionId,
                    selectedTenantId: tenantJumpoint.tenantId,
                    selectedJumpointId: tenantJumpoint.jumpoint.id,
                    selectedJumpointName: tenantJumpoint.jumpoint.name,
                    contentDisposition: responseHeaders['content-disposition'],
                    contentLength: responseHeaders['content-length'],
                    contentType: responseHeaders['content-type'],
                });

                return response;
            } catch (error) {
                this.logger.error({
                    event: 'jumpoint-installer-download-failed',
                    transactionId: query.transactionId,
                    failedTenantId: tenantJumpoint.tenantId,
                    failedJumpointId: tenantJumpoint.jumpoint.id,
                    failedJumpointName: tenantJumpoint.jumpoint.name,
                    error: ErrorProcessorUtility.stringify(error),
                });
            }
        }

        throw new NotFoundException(
            `No downloadable jumpoint installer found for business unit ${query.businessUnits}, customer key ${
                query.customerKey ?? '-'
            } and site key ${query.siteKey}. Ensure the jumpoint exists in BeyondTrust and has a valid key_info (installer key) configured.`,
        );
    }

    private async getCustomer(transactionId: string, customerKey: string | undefined, businessUnits: BusinessUnit[]) {
        if (!customerKey) {
            return undefined;
        }

        const customers = await this.queryBus.execute<RetrieveCustomersQuery, Customer[]>(
            new RetrieveCustomersQuery(transactionId, 1, 1, customerKey, undefined, undefined, businessUnits),
        );

        if (customers.length === 0 || !customers[0]) {
            throw new NotFoundException(`Customer with key ${customerKey} not found.`);
        }

        return customers[0];
    }

    private async getSite(transactionId: string, siteKey: string, customerKey: string | undefined) {
        const sites = await this.queryBus.execute<RetrieveSitesQuery, Site[]>(
            new RetrieveSitesQuery(transactionId, 1, 1, siteKey, undefined, customerKey ? [customerKey] : undefined),
        );

        if (sites.length === 0 || !sites[0]) {
            throw new NotFoundException(`Site with key ${siteKey} and customer key ${customerKey ?? '-'} not found.`);
        }

        return sites[0];
    }

    private async getJumpoints(
        transactionId: string,
        customer: Customer | undefined,
        site: Site,
        businessUnits: BusinessUnit[],
    ) {
        const tenantJumpoints: { tenantId: number; jumpoint: Jumpoint }[] = [];
        const btInstances = await this.getAllBTInstances(transactionId);
        const jumpointNamePatterns = customer
            ? [
                  `${customer.businessUnit}%${customer.name.toUpperCase()}_${site.name.toUpperCase()}_${site.key.toUpperCase()}`,
              ]
            : businessUnits.map(
                  (businessUnit) => `${businessUnit}%_${site.name.toUpperCase()}_${site.key.toUpperCase()}`,
              );

        this.logger.log({
            transactionId,
            siteKey: site.key,
            customerKey: customer?.key,
            jumpointNamePatterns,
        });

        for (const btInstance of btInstances) {
            const jumpoints = await PaginationUtility.queryUntilLastPage((pageNumber: number) =>
                this.queryBus.execute<RetrieveJumpointsQuery, Jumpoint[]>(
                    new RetrieveJumpointsQuery(
                        transactionId,
                        btInstance.id,
                        RetrieveJumpointInstallerByCustomerAndSiteQueryHandler.MAX_PAGE_RETRIEVAL_SIZE,
                        pageNumber,
                        undefined,
                        undefined,
                        undefined,
                        undefined,
                        undefined,
                        jumpointNamePatterns,
                    ),
                ),
            );

            for (const jumpoint of jumpoints) {
                tenantJumpoints.push({ tenantId: btInstance.id, jumpoint });
            }
        }

        if (tenantJumpoints.length === 0) {
            throw new NotFoundException(
                `No jumpoints found for name pattern search '${jumpointNamePatterns}' in all tenants.`,
            );
        }

        return tenantJumpoints;
    }

    private async getAllBTInstances(transactionId: string) {
        return await PaginationUtility.queryUntilLastPage((pageNumber) =>
            this.queryBus.execute<RetrieveBeyondtrustInstancesQuery, BeyondtrustInstance[]>(
                new RetrieveBeyondtrustInstancesQuery(
                    transactionId,
                    RetrieveJumpointInstallerByCustomerAndSiteQueryHandler.MAX_PAGE_RETRIEVAL_SIZE,
                    pageNumber,
                ),
            ),
        );
    }

    private filterJumpointsWithKeyInfo(
        tenantJumpoints: {
            tenantId: number;
            jumpoint: Jumpoint;
        }[],
        businessUnits: BusinessUnit[],
        customerKey: string | undefined,
        siteKey: string,
    ) {
        const jumpointsWithKeyInfo = tenantJumpoints.filter((tenantJumpoint) => !!tenantJumpoint.jumpoint.keyInfo);

        if (jumpointsWithKeyInfo.length === 0) {
            throw new NotFoundException(
                `No jumpoint installer found for business units ${businessUnits.join(', ')}, customer key ${customerKey ?? '-'} and site key ${siteKey}.`,
            );
        }

        return jumpointsWithKeyInfo;
    }
}
