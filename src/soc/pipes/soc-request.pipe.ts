import { ArgumentMetadata, ForbiddenException, Inject, Injectable, PipeTransform } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { QueryBus } from '@nestjs/cqrs';
import { Request } from 'express';
import { TRANSACTION_ID_HEADER } from '../../core/decorators';
import { SuperAdminUtility, UuidUtility } from '../../shared/utilities';
import { Site } from '../../site/models';
import { RetrieveSitesQuery } from '../../site/queries';
import { CustomerSiteInfo } from '../models';

@Injectable()
export class SocRequestPipe implements PipeTransform {
    constructor(
        @Inject(REQUEST) private readonly request: Request,
        private readonly queryBus: QueryBus,
    ) {}

    public async transform(value: unknown, metadata: ArgumentMetadata) {
        // Skip if this isn't an HTTP request body, query, param.
        if (metadata.type !== 'query' && metadata.type !== 'body' && metadata.type !== 'param') {
            return value;
        }

        if (!this.request.headers[TRANSACTION_ID_HEADER.toLowerCase()]) {
            this.request.headers[TRANSACTION_ID_HEADER.toLowerCase()] = UuidUtility.generate();
        }

        const transactionId = this.request.headers[TRANSACTION_ID_HEADER.toLowerCase()] as string;

        if (SuperAdminUtility.isSuperAdmin(this.request.authInfo?.access?.value?.businessUnits ?? [])) {
            return value;
        }

        const customerScopes = this.request.customers!;
        const customerScopeKeys = customerScopes.map((c) => c.key);

        const customerSiteInfo = (
            this.request.body as {
                customerSiteInfo?: CustomerSiteInfo[];
            }
        ).customerSiteInfo?.filter((csi) => csi.customerKey !== undefined || csi.siteKey !== undefined);

        // Limit the customerSiteInfo to only those that are within the customer's scope
        if (!customerSiteInfo || customerSiteInfo.length === 0) {
            const dto = value as { customerSiteInfo?: CustomerSiteInfo[] };
            dto.customerSiteInfo = customerScopeKeys.map((customerKey) => ({
                customerKey,
                siteKey: undefined,
            }));
        } else {
            for (const { customerKey, siteKey } of customerSiteInfo) {
                if (customerKey && !customerScopeKeys.includes(customerKey)) {
                    throw new ForbiddenException(`Forbidden customer access with customer key: ${customerKey}`);
                }

                if (siteKey) {
                    const sites = await this.queryBus.execute<RetrieveSitesQuery, Site[]>(
                        new RetrieveSitesQuery(
                            transactionId,
                            1,
                            1,
                            siteKey,
                            undefined,
                            customerKey ? [customerKey] : customerScopeKeys,
                        ),
                    );

                    if (sites.length === 0) {
                        throw new ForbiddenException(
                            `Site not found or forbidden access to the site with site key: ${siteKey}`,
                        );
                    }
                }
            }
        }

        return value;
    }
}
