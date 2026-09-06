import { SocCustomerSiteMappingStatus } from '../enums';
import { SocCustomerSiteMapping } from '../models';

export interface SocFilterCriteria {
    customerKey?: string;
    siteKey?: string;
    mappingStatus?: SocCustomerSiteMappingStatus;

    /** `undefined` grants platform-wide visibility, including unmapped objects. */
    scopedCustomerKeys?: string[];
}

export abstract class SocFilterUtility {
    public static apply<TItem extends SocCustomerSiteMapping>(items: TItem[], criteria: SocFilterCriteria): TItem[] {
        let result = items;

        // The scope is applied before anything else so that the reported total never
        // discloses how many objects exist outside the caller's visibility.
        if (criteria.scopedCustomerKeys !== undefined) {
            const allowedCustomerKeys = new Set(criteria.scopedCustomerKeys);

            result = result.filter(
                (item) => item.customerKey !== undefined && allowedCustomerKeys.has(item.customerKey),
            );
        }

        if (criteria.customerKey !== undefined) {
            result = result.filter((item) => item.customerKey === criteria.customerKey);
        }

        if (criteria.siteKey !== undefined) {
            result = result.filter((item) => item.siteKey === criteria.siteKey);
        }

        if (criteria.mappingStatus !== undefined) {
            result = result.filter((item) => item.mappingStatus === criteria.mappingStatus);
        }

        return result;
    }
}
