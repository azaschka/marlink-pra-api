import { SocCustomerSiteMappingStatus } from '../enums';

/**
 * Customer/site attribution attached to every object the SOC endpoints return.
 *
 * The individual keys stay optional because attribution is best-effort; `mappingStatus`
 * states unambiguously how far the attribution got.
 */
export interface SocCustomerSiteMapping {
    customerKey?: string;
    customerName?: string;
    siteKey?: string;
    siteName?: string;
    mappingStatus: SocCustomerSiteMappingStatus;
}
